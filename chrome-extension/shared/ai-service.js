import storage from './storage.js';
import { MOCK_RESPONSES } from './constants.js';
import {
  AI_PROVIDERS,
  PROVIDER_KIND,
  getProvider,
  listProviders,
  normalizeProviderId,
} from './providers.js';
import { replaceVariables } from './helpers.js';

/**
 * Neutral message shape used by every caller:
 *   { role: 'system' | 'user' | 'assistant' | 'tool',
 *     content: string,
 *     toolCalls?: [{ id, name, args }],   // assistant turns only
 *     toolCallId?, name? }                // tool result turns only
 *
 * The adapters below translate that into each provider's wire format and parse
 * the reply back into { content, toolCalls }. Everything else in the extension
 * — templates, workflows, the agent loop — speaks only the neutral shape.
 */

function stripTrailingSlash(url) {
  return typeof url === 'string' ? url.replace(/\/+$/, '') : url;
}

function safeParseJson(value, fallback = {}) {
  if (typeof value !== 'string') {
    return value || fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// Pulls the most useful message out of an error body, whatever shape it has.
function extractErrorMessage(body, fallback) {
  if (!body) {
    return fallback;
  }
  const candidate =
    body.error?.message ||
    body.message ||
    (typeof body.error === 'string' ? body.error : null) ||
    body.detail;
  return candidate || fallback;
}

const openAiAdapter = {
  buildRequest({
    provider,
    baseUrl,
    apiKey,
    model,
    messages,
    tools,
    maxTokens,
  }) {
    const body = {
      model,
      messages: messages.map((message) => {
        if (message.role === 'tool') {
          return {
            role: 'tool',
            tool_call_id: message.toolCallId,
            content: message.content,
          };
        }

        if (message.toolCalls?.length) {
          return {
            role: 'assistant',
            content: message.content || null,
            tool_calls: message.toolCalls.map((call) => ({
              id: call.id,
              type: 'function',
              function: {
                name: call.name,
                arguments: JSON.stringify(call.args ?? {}),
              },
            })),
          };
        }

        return { role: message.role, content: message.content };
      }),
    };

    body[provider.maxTokensParam || 'max_tokens'] = maxTokens;
    if (provider.supportsTemperature !== false) {
      body.temperature = 0.7;
    }

    if (tools.length > 0) {
      body.tools = tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    return { url: `${baseUrl}/chat/completions`, headers, body };
  },

  parseResponse(data) {
    const message = data.choices?.[0]?.message || {};
    return {
      content: message.content || '',
      toolCalls: (message.tool_calls || []).map((call) => ({
        id: call.id,
        name: call.function?.name,
        args: safeParseJson(call.function?.arguments),
      })),
    };
  },
};

const anthropicAdapter = {
  buildRequest({
    provider,
    baseUrl,
    apiKey,
    model,
    messages,
    tools,
    maxTokens,
  }) {
    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');

    const body = {
      model,
      max_tokens: maxTokens,
      messages: messages
        .filter((message) => message.role !== 'system')
        .map((message) => {
          if (message.role === 'tool') {
            return {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: message.toolCallId,
                  content: message.content,
                },
              ],
            };
          }

          if (message.toolCalls?.length) {
            const blocks = [];
            if (message.content) {
              blocks.push({ type: 'text', text: message.content });
            }
            message.toolCalls.forEach((call) => {
              blocks.push({
                type: 'tool_use',
                id: call.id,
                name: call.name,
                input: call.args ?? {},
              });
            });
            return { role: 'assistant', content: blocks };
          }

          return { role: message.role, content: message.content };
        }),
    };

    if (system) {
      body.system = system;
    }

    if (tools.length > 0) {
      body.tools = tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      }));
    }

    return {
      url: `${baseUrl}/messages`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': provider.apiVersion,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body,
    };
  },

  parseResponse(data) {
    const blocks = data.content || [];
    return {
      content: blocks
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n'),
      toolCalls: blocks
        .filter((block) => block.type === 'tool_use')
        .map((block) => ({
          id: block.id,
          name: block.name,
          args: block.input || {},
        })),
    };
  },
};

const geminiAdapter = {
  buildRequest({ baseUrl, apiKey, model, messages, tools, maxTokens }) {
    const systemParts = messages
      .filter((message) => message.role === 'system')
      .map((message) => ({ text: message.content }));

    const body = {
      contents: messages
        .filter((message) => message.role !== 'system')
        .map((message) => {
          if (message.role === 'tool') {
            return {
              role: 'user',
              parts: [
                {
                  functionResponse: {
                    name: message.name || message.toolCallId,
                    response: { result: message.content },
                  },
                },
              ],
            };
          }

          if (message.toolCalls?.length) {
            const parts = message.content ? [{ text: message.content }] : [];
            message.toolCalls.forEach((call) => {
              parts.push({
                functionCall: { name: call.name, args: call.args ?? {} },
              });
            });
            return { role: 'model', parts };
          }

          return {
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          };
        }),
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemParts.length > 0) {
      body.systemInstruction = { parts: systemParts };
    }

    if (tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          })),
        },
      ];
    }

    return {
      // The key goes in a header rather than the query string so it stays out
      // of any URL that might get logged.
      url: `${baseUrl}/models/${model}:generateContent`,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body,
    };
  },

  parseResponse(data) {
    if (data.error) {
      throw new Error(data.error.message || 'Gemini API returned an error');
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    return {
      content: parts
        .filter((part) => typeof part.text === 'string')
        .map((part) => part.text)
        .join(''),
      toolCalls: parts
        .filter((part) => part.functionCall)
        // Gemini has no call ids; the function name round-trips instead.
        .map((part) => ({
          id: part.functionCall.name,
          name: part.functionCall.name,
          args: part.functionCall.args || {},
        })),
    };
  },
};

const ADAPTERS = {
  [PROVIDER_KIND.OPENAI]: openAiAdapter,
  [PROVIDER_KIND.ANTHROPIC]: anthropicAdapter,
  [PROVIDER_KIND.GEMINI]: geminiAdapter,
};

class AIService {
  constructor() {
    this.settings = null;
    this.rateLimitWindow = 60000; // 1 minute
    this.maxRequestsPerWindow = 20;
    this.requestTimestamps = [];
    // Share of mock-provider calls that fail, to demo error handling.
    // Set to 0 in tests so assertions on the mock path are deterministic.
    this.mockFailureRate = 0.1;
  }

  async init() {
    this.settings = await storage.getSettings();
  }

  async ensureSettings() {
    if (!this.settings) {
      await this.init();
    }
    return this.settings;
  }

  /**
   * The single entry point every provider call goes through.
   * Returns { content, toolCalls, provider, model }.
   */
  async chat({
    messages,
    tools = [],
    provider: providerId,
    model: modelOverride,
    maxTokens = 1000,
    skipRateLimit = false,
  }) {
    await this.ensureSettings();

    if (!skipRateLimit && !this.checkRateLimit()) {
      throw new Error(
        'Rate limit exceeded. Please wait a moment before trying again.'
      );
    }

    const provider = getProvider(providerId || this.settings.provider);
    const model = modelOverride || this.resolveModel(provider.id);

    if (provider.kind === PROVIDER_KIND.MOCK) {
      return {
        content: await this.processWithMock(
          messages.map((message) => message.content).join('\n')
        ),
        toolCalls: [],
        provider: provider.id,
        model,
      };
    }

    const apiKey = this.getApiKey(provider.id);
    if (provider.requiresApiKey && !apiKey) {
      throw new Error(
        `${provider.name} API key not configured. Please add your API key in settings.`
      );
    }

    const baseUrl = this.resolveBaseUrl(provider.id);
    if (!baseUrl) {
      throw new Error(
        `${provider.name} endpoint not configured. Please set a base URL in settings.`
      );
    }

    if (!model) {
      throw new Error(
        `No model selected for ${provider.name}. Please choose a model in settings.`
      );
    }

    const adapter = ADAPTERS[provider.kind];
    const { url, headers, body } = adapter.buildRequest({
      provider,
      baseUrl,
      apiKey,
      model,
      messages,
      tools: provider.supportsTools ? tools : [],
      maxTokens,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(await this.buildHttpError(provider, response));
    }

    const parsed = adapter.parseResponse(await response.json());
    return { ...parsed, provider: provider.id, model };
  }

  async buildHttpError(provider, response) {
    const fallback = `${provider.name} API error: ${response.status} ${response.statusText}`;
    let message;

    try {
      message = extractErrorMessage(await response.json(), fallback);
    } catch {
      return fallback;
    }

    if (provider.local && (response.status === 404 || response.status === 0)) {
      return `${message}\n\nIs ${provider.name} running and the model pulled? Expected endpoint: ${this.resolveBaseUrl(provider.id)}`;
    }

    if (/quota|rate limit/i.test(message)) {
      return `${message}\n\nWait a moment, check your plan's quota, or switch to a smaller model in settings.`;
    }

    if (/api key|unauthorized|authentication/i.test(message)) {
      return `${message}\n\nVerify your ${provider.name} API key in settings${provider.apiKeyUrl ? ` (${provider.apiKeyUrl})` : ''}.`;
    }

    return message;
  }

  async processTemplate(template, inputs, options = {}) {
    await this.ensureSettings();

    const processedPrompt = replaceVariables(template.prompt, inputs);
    const providerId = normalizeProviderId(
      options.provider || this.settings.provider
    );

    try {
      const startTime = Date.now();
      const messages = [];
      if (template.systemPrompt) {
        messages.push({ role: 'system', content: template.systemPrompt });
      }
      messages.push({ role: 'user', content: processedPrompt });

      const { content, model } = await this.chat({
        messages,
        provider: providerId,
        model: options.model,
      });

      return {
        result: content || 'No response generated',
        duration: Date.now() - startTime,
        provider: providerId,
        model,
        processedPrompt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('AI processing failed:', error);
      // Rate-limit rejections are about the caller, not the provider, so they
      // pass through unwrapped for callers that match on the message.
      if (error.message.startsWith('Rate limit exceeded')) {
        throw error;
      }
      throw new Error(`AI processing failed: ${error.message}`, {
        cause: error,
      });
    }
  }

  async processWithMock(prompt) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 2000 + 500)
    );

    if (Math.random() < this.mockFailureRate) {
      throw new Error('Simulated AI service error for testing');
    }

    const responses = [
      ...MOCK_RESPONSES,
      `Mock AI Response: Processing completed for your prompt. This is a simulated response that would normally come from ${this.settings.provider} AI service.`,
      `Demo Response: Your template has been processed successfully. Original prompt length: ${prompt.length} characters.`,
      `Simulated Output: This response demonstrates how the AI would interpret and respond to your template inputs.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  checkRateLimit() {
    const now = Date.now();

    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.rateLimitWindow
    );

    if (this.requestTimestamps.length >= this.maxRequestsPerWindow) {
      return false;
    }

    this.requestTimestamps.push(now);
    return true;
  }

  async testConnection() {
    await this.ensureSettings();

    try {
      const testPrompt =
        'Hello, this is a connection test. Please respond with "Connection successful".';
      const result = await this.processTemplate({ prompt: testPrompt }, {});
      return {
        success: true,
        provider: this.settings.provider,
        model: result.model,
        response: result.result,
      };
    } catch (error) {
      return {
        success: false,
        provider: this.settings.provider,
        error: error.message,
      };
    }
  }

  /** Lists the models a local or aggregating endpoint is actually serving. */
  async listRemoteModels(providerId) {
    await this.ensureSettings();

    const provider = getProvider(providerId);
    if (!provider.supportsModelListing) {
      return provider.models;
    }

    const baseUrl = this.resolveBaseUrl(provider.id);
    if (!baseUrl) {
      throw new Error(`No endpoint configured for ${provider.name}`);
    }

    const apiKey = this.getApiKey(provider.id);
    const response = await fetch(`${baseUrl}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });

    if (!response.ok) {
      throw new Error(await this.buildHttpError(provider, response));
    }

    const data = await response.json();
    return (data.data || data.models || [])
      .map((entry) => entry.id || entry.name)
      .filter(Boolean)
      .sort();
  }

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await storage.setSettings(this.settings);
  }

  getApiKey(provider) {
    const targetProvider = normalizeProviderId(
      provider || this.settings.provider
    );

    // Check new apiKeys structure first
    if (this.settings.apiKeys && this.settings.apiKeys[targetProvider]) {
      return this.settings.apiKeys[targetProvider];
    }

    // Fallback to legacy apiKey field if it matches current provider
    if (
      this.settings.apiKey &&
      targetProvider === normalizeProviderId(this.settings.provider)
    ) {
      return this.settings.apiKey;
    }

    return '';
  }

  resolveModel(providerId) {
    const provider = getProvider(providerId);
    const configured = this.settings?.providerConfig?.[provider.id]?.model;
    return (configured || '').trim() || provider.defaultModel;
  }

  resolveBaseUrl(providerId) {
    const provider = getProvider(providerId);
    const configured = this.settings?.providerConfig?.[provider.id]?.baseUrl;
    return stripTrailingSlash((configured || '').trim() || provider.baseUrl);
  }

  getAvailableProviders() {
    return listProviders().map((provider) => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      requiresApiKey: provider.requiresApiKey,
      apiKeyUrl: provider.apiKeyUrl || provider.setupUrl,
      configurableBaseUrl: !!provider.configurableBaseUrl,
      supportsModelListing: !!provider.supportsModelListing,
      local: !!provider.local,
      models: provider.models,
      defaultModel: provider.defaultModel,
      defaultBaseUrl: provider.baseUrl || '',
    }));
  }

  getCurrentProvider() {
    if (!this.settings) {
      return null;
    }

    const current = normalizeProviderId(this.settings.provider);
    return this.getAvailableProviders().find(
      (provider) => provider.id === current
    );
  }

  getRateLimitInfo() {
    const now = Date.now();
    const recentRequests = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.rateLimitWindow
    );

    return {
      requestsInWindow: recentRequests.length,
      maxRequests: this.maxRequestsPerWindow,
      windowDuration: this.rateLimitWindow,
      canMakeRequest: recentRequests.length < this.maxRequestsPerWindow,
      resetTime:
        recentRequests.length > 0
          ? new Date(Math.min(...recentRequests) + this.rateLimitWindow)
          : new Date(),
    };
  }

  async validateApiKey(provider, apiKey, overrides = {}) {
    if (provider === AI_PROVIDERS.MOCK) {
      return {
        valid: true,
        message: 'Mock provider does not require API key validation',
      };
    }

    const definition = getProvider(provider);
    if (definition.requiresApiKey && (!apiKey || apiKey.trim().length === 0)) {
      return { valid: false, message: 'API key is required' };
    }

    // getApiKey() reads apiKeys[provider] before the legacy apiKey field, so
    // the candidate key has to be set in both or the stored one wins.
    const tempSettings = {
      ...this.settings,
      provider,
      apiKey,
      apiKeys: { ...this.settings?.apiKeys, [provider]: apiKey },
      providerConfig: {
        ...this.settings?.providerConfig,
        [provider]: {
          ...this.settings?.providerConfig?.[provider],
          ...overrides,
        },
      },
    };

    try {
      const testResult = await this.withSettings(tempSettings, () =>
        this.testConnection()
      );

      return {
        valid: testResult.success,
        message: testResult.success
          ? 'Connection is valid and working'
          : `Connection failed: ${testResult.error}`,
      };
    } catch (error) {
      return {
        valid: false,
        message: `Connection test error: ${error.message}`,
      };
    }
  }

  // Runs fn with this.settings temporarily replaced, serializing overlapping
  // swaps so one caller's restore can't stomp another's temporary settings.
  // ponytail: a concurrent processTemplate() still reads the swapped settings;
  // threading settings through the provider methods would remove that window.
  async withSettings(tempSettings, fn) {
    const run = async () => {
      const original = this.settings;
      this.settings = tempSettings;
      try {
        return await fn();
      } finally {
        this.settings = original;
      }
    };

    this.settingsLock = (this.settingsLock || Promise.resolve()).then(run, run);
    return this.settingsLock;
  }
}

export default new AIService();
