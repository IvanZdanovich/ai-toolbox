import storage from './storage.js';
import { AI_PROVIDERS, MOCK_RESPONSES } from './constants.js';
import { replaceVariables } from './helpers.js';

class AIService {
  constructor() {
    this.settings = null;
    this.requestCount = 0;
    this.rateLimitWindow = 60000; // 1 minute
    this.maxRequestsPerWindow = 20;
    this.requestTimestamps = [];
  }

  async init() {
    this.settings = await storage.getSettings();
  }

  async processTemplate(template, inputs) {
    if (!this.settings) {
      await this.init();
    }

    if (!this.checkRateLimit()) {
      throw new Error(
        'Rate limit exceeded. Please wait a moment before trying again.'
      );
    }

    const processedPrompt = replaceVariables(template.prompt, inputs);

    try {
      const startTime = Date.now();
      let result;

      switch (this.settings.provider) {
        case AI_PROVIDERS.OPENAI:
          result = await this.processWithOpenAI(processedPrompt);
          break;
        case AI_PROVIDERS.CLAUDE:
          result = await this.processWithClaude(processedPrompt);
          break;
        case AI_PROVIDERS.GEMINI:
          result = await this.processWithGemini(processedPrompt);
          break;
        case AI_PROVIDERS.LLAMA:
          result = await this.processWithLlama(processedPrompt);
          break;
        case AI_PROVIDERS.GROK:
          result = await this.processWithGrok(processedPrompt);
          break;
        case AI_PROVIDERS.MOCK:
        default:
          result = await this.processWithMock(processedPrompt);
          break;
      }

      const duration = Date.now() - startTime;

      return {
        result,
        duration,
        provider: this.settings.provider,
        processedPrompt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('AI processing failed:', error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  async processWithMock(prompt) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 2000 + 500)
    );

    if (Math.random() < 0.1) {
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

  async processWithOpenAI(prompt) {
    if (!this.settings.apiKey) {
      throw new Error(
        'OpenAI API key not configured. Please add your API key in settings.'
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(
        error.error?.message || `OpenAI API error: ${response.status}`
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated';
  }

  async processWithClaude(prompt) {
    if (!this.settings.apiKey) {
      throw new Error(
        'Claude API key not configured. Please add your API key in settings.'
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(
        error.error?.message || `Claude API error: ${response.status}`
      );
    }

    const data = await response.json();
    return data.content[0]?.text || 'No response generated';
  }

  async processWithGemini(prompt) {
    if (!this.settings.apiKey) {
      throw new Error(
        'Gemini API key not configured. Please add your API key in settings.'
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.settings.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(
        error.error?.message || `Gemini API error: ${response.status}`
      );
    }

    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
    );
  }

  async processWithLlama(prompt) {
    if (!this.settings.apiKey) {
      throw new Error(
        'Llama API key not configured. Please add your API key in settings.'
      );
    }

    const response = await fetch(
      'https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.settings.apiKey}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.7,
            top_p: 0.95,
            return_full_text: false,
          },
          options: {
            wait_for_model: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Llama API error: ${response.status}`);
    }

    const data = await response.json();
    return data[0]?.generated_text || 'No response generated';
  }

  async processWithGrok(prompt) {
    if (!this.settings.apiKey) {
      throw new Error(
        'Grok API key not configured. Please add your API key in settings.'
      );
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(
        error.error?.message || `Grok API error: ${response.status}`
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated';
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
    if (!this.settings) {
      await this.init();
    }

    try {
      const testPrompt =
        'Hello, this is a connection test. Please respond with "Connection successful".';
      const result = await this.processTemplate({ prompt: testPrompt }, {});
      return {
        success: true,
        provider: this.settings.provider,
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

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await storage.setSettings(this.settings);
  }

  getAvailableProviders() {
    return [
      {
        id: AI_PROVIDERS.MOCK,
        name: 'Mock AI (Demo)',
        description: 'Simulated AI responses for testing and demo purposes',
        requiresApiKey: false,
      },
      {
        id: AI_PROVIDERS.OPENAI,
        name: 'OpenAI GPT',
        description: 'OpenAI GPT-3.5 Turbo for high-quality text generation',
        requiresApiKey: true,
        apiKeyUrl: 'https://platform.openai.com/api-keys',
      },
      {
        id: AI_PROVIDERS.CLAUDE,
        name: 'Anthropic Claude',
        description: 'Claude 3 Haiku for fast and efficient AI responses',
        requiresApiKey: true,
        apiKeyUrl: 'https://console.anthropic.com/',
      },
      {
        id: AI_PROVIDERS.GEMINI,
        name: 'Google Gemini',
        description: 'Google Gemini 1.5 Flash for multimodal AI capabilities',
        requiresApiKey: true,
        apiKeyUrl: 'https://aistudio.google.com/app/apikey',
      },
      {
        id: AI_PROVIDERS.LLAMA,
        name: 'Meta Llama',
        description: 'Llama models via Hugging Face Inference API',
        requiresApiKey: true,
        apiKeyUrl: 'https://huggingface.co/settings/tokens',
      },
      {
        id: AI_PROVIDERS.GROK,
        name: 'xAI Grok',
        description: 'Grok AI model with real-time knowledge and wit',
        requiresApiKey: true,
        apiKeyUrl: 'https://console.x.ai/',
      },
    ];
  }

  getCurrentProvider() {
    if (!this.settings) {
      return null;
    }

    const providers = this.getAvailableProviders();
    return providers.find((provider) => provider.id === this.settings.provider);
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

  async encryptApiKey(apiKey) {
    if (!apiKey) {
      return '';
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);

      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));
    } catch (error) {
      console.error('Encryption failed:', error);
      return apiKey;
    }
  }

  async validateApiKey(provider, apiKey) {
    if (provider === AI_PROVIDERS.MOCK) {
      return {
        valid: true,
        message: 'Mock provider does not require API key validation',
      };
    }

    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, message: 'API key is required' };
    }

    const tempSettings = { ...this.settings, provider, apiKey };
    const originalSettings = this.settings;
    this.settings = tempSettings;

    try {
      const testResult = await this.testConnection();
      this.settings = originalSettings;

      return {
        valid: testResult.success,
        message: testResult.success
          ? 'API key is valid and working'
          : `API key validation failed: ${testResult.error}`,
      };
    } catch (error) {
      this.settings = originalSettings;
      return {
        valid: false,
        message: `API key validation error: ${error.message}`,
      };
    }
  }
}

export default new AIService();
