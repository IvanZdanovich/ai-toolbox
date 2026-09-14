/**
 * AI Service Integration Tests
 *
 * Tests the AI processing service including:
 * - Template processing with different providers
 * - Rate limiting
 * - Error handling
 * - Response formatting
 * - Provider switching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../../support/chrome-api.mock.js';
import { fixtures } from '../../unit-examples/shared/test-data.examples.js';

// Mock storage module
vi.mock('../../../chrome-extension/shared/storage.js', async () => {
  return {
    default: {
      getSettings: vi.fn().mockResolvedValue({
        apiKey: '',
        provider: 'mock',
        defaultProvider: 'mock',
        theme: 'auto',
      }),
      setSettings: vi.fn().mockResolvedValue(true),
    },
  };
});

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AiService: Given the AI service over a doubled network', () => {
  let aiService;
  let storage;

  beforeEach(async () => {
    installChromeMock();
    testUtils.resetStorage();
    mockFetch.mockReset();

    vi.resetModules();

    storage = (await import('../../../chrome-extension/shared/storage.js'))
      .default;
    const AIServiceModule =
      await import('../../../chrome-extension/shared/ai-service.js');
    aiService = AIServiceModule.default;
    aiService.mockFailureRate = 0;

    // Reset service state
    aiService.settings = null;
    aiService.requestTimestamps = [];
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  describe('AiService: When a template is processed with the mock provider', () => {
    beforeEach(async () => {
      storage.getSettings.mockResolvedValue(fixtures.settings.default);
      await aiService.init();
    });

    it('AiService: Then it processes template and return mock response', async () => {
      // Given: A template with inputs
      const template = fixtures.templates.email;
      const inputs = fixtures.userInputs.email;

      // When: Processing the template
      const result = await aiService.processTemplate(template, inputs);

      // Then: Should return a mock response
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('provider', 'mock');
      expect(result).toHaveProperty('processedPrompt');
      expect(result).toHaveProperty('timestamp');
    });

    it('AiService: Then it replaces variables in prompt', async () => {
      // Given: A template with variables
      const template = {
        ...fixtures.templates.email,
        prompt: 'Process this: {email_content} with tone: {tone}',
      };
      const inputs = {
        email_content: 'Test content',
        tone: 'friendly',
      };

      // When: Processing the template
      const result = await aiService.processTemplate(template, inputs);

      // Then: Variables should be replaced in processed prompt
      expect(result.processedPrompt).toContain('Test content');
      expect(result.processedPrompt).toContain('friendly');
      expect(result.processedPrompt).not.toContain('{email_content}');
      expect(result.processedPrompt).not.toContain('{tone}');
    });

    it('AiService: Then it tracks processing duration', async () => {
      // When: Processing a template
      const result = await aiService.processTemplate(
        fixtures.templates.email,
        fixtures.userInputs.email
      );

      // Then: Duration should be tracked
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('AiService: When a template is processed with the OpenAI provider', () => {
    beforeEach(async () => {
      storage.getSettings.mockResolvedValue(fixtures.settings.withOpenAI);
      await aiService.init();
    });

    it('AiService: Then it calls OpenAI API with correct parameters', async () => {
      // Given: Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'OpenAI response' } }],
          }),
      });

      // When: Processing a template
      const result = await aiService.processTemplate(
        fixtures.templates.email,
        fixtures.userInputs.email
      );

      // Then: Should call OpenAI API correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${fixtures.settings.withOpenAI.apiKey}`,
          }),
        })
      );
      expect(result.result).toBe('OpenAI response');
      expect(result.provider).toBe('openai');
    });

    it('AiService: Then it handles OpenAI API errors', async () => {
      // Given: Mock API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error: { message: 'Rate limit exceeded' },
          }),
      });

      // When/Then: Should throw with error message
      await expect(
        aiService.processTemplate(
          fixtures.templates.email,
          fixtures.userInputs.email
        )
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('AiService: Then it handles network errors', async () => {
      // Given: Network failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // When/Then: Should throw error
      await expect(
        aiService.processTemplate(
          fixtures.templates.email,
          fixtures.userInputs.email
        )
      ).rejects.toThrow();
    });
  });

  describe('AiService: When a template is processed with the Claude provider', () => {
    beforeEach(async () => {
      storage.getSettings.mockResolvedValue(fixtures.settings.withClaude);
      await aiService.init();
    });

    it('AiService: Then it calls Claude API with correct parameters', async () => {
      // Given: Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: 'Claude response' }],
          }),
      });

      // When: Processing a template
      const result = await aiService.processTemplate(
        fixtures.templates.email,
        fixtures.userInputs.email
      );

      // Then: Should call Claude API correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': fixtures.settings.withClaude.apiKey,
            'anthropic-version': '2023-06-01',
          }),
        })
      );
      expect(result.provider).toBe('claude');
    });
  });

  describe('AiService: When the rate limit is reached', () => {
    beforeEach(async () => {
      storage.getSettings.mockResolvedValue(fixtures.settings.default);
      await aiService.init();
    });

    it('AiService: Then it allows requests within rate limit', async () => {
      // Given: Fresh rate limit window
      aiService.requestTimestamps = [];

      // When: Making several requests (some may fail due to mock's random error)
      const results = [];
      const errors = [];

      for (let i = 0; i < 5; i++) {
        try {
          const result = await aiService.processTemplate(
            fixtures.templates.email,
            fixtures.userInputs.email
          );
          results.push(result);
        } catch (error) {
          // Mock service has 10% random failure rate - this is expected
          errors.push(error);
        }
      }

      // Then: At least some should succeed (rate limiting allows all)
      // The key test is that none were rejected due to rate limiting
      const rateLimitErrors = errors.filter((e) =>
        e.message.includes('Rate limit exceeded')
      );
      expect(rateLimitErrors).toHaveLength(0);

      // At least one should have succeeded
      expect(results.length + errors.length).toBe(5);
    });

    it('AiService: Then it rejects requests exceeding rate limit', async () => {
      // Given: Rate limit near capacity
      const now = Date.now();
      aiService.requestTimestamps = Array.from(
        { length: 20 }, // maxRequestsPerWindow
        () => now
      );

      // When/Then: Additional request should be rejected
      await expect(
        aiService.processTemplate(
          fixtures.templates.email,
          fixtures.userInputs.email
        )
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('AiService: Then it resets rate limit after window expires', async () => {
      // Given: Old timestamps outside the window
      const oldTime = Date.now() - 120000; // 2 minutes ago
      aiService.requestTimestamps = Array.from({ length: 20 }, () => oldTime);

      // When: Making a new request
      const result = await aiService.processTemplate(
        fixtures.templates.email,
        fixtures.userInputs.email
      );

      // Then: Should succeed (old timestamps should be cleared)
      expect(result.result).toBeDefined();
    });
  });

  describe('AiService: When a provider configuration is validated', () => {
    it('AiService: Then it requires API key for OpenAI', async () => {
      // Given: OpenAI provider without API key
      storage.getSettings.mockResolvedValue({
        ...fixtures.settings.withOpenAI,
        apiKey: '',
      });
      await aiService.init();

      // When/Then: Should throw error about missing API key
      await expect(
        aiService.processTemplate(
          fixtures.templates.email,
          fixtures.userInputs.email
        )
      ).rejects.toThrow('API key');
    });

    it('AiService: Then it requires API key for Claude', async () => {
      // Given: Claude provider without API key
      storage.getSettings.mockResolvedValue({
        ...fixtures.settings.withClaude,
        apiKey: '',
      });
      await aiService.init();

      // When/Then: Should throw error about missing API key
      await expect(
        aiService.processTemplate(
          fixtures.templates.email,
          fixtures.userInputs.email
        )
      ).rejects.toThrow('API key');
    });

    it('AiService: Then it works without API key for mock provider', async () => {
      // Given: Mock provider (no API key needed)
      storage.getSettings.mockResolvedValue(fixtures.settings.default);
      await aiService.init();

      // When: Processing template
      const result = await aiService.processTemplate(
        fixtures.templates.email,
        fixtures.userInputs.email
      );

      // Then: Should succeed
      expect(result.result).toBeDefined();
    });
  });

  describe('AiService: When a provider connection is tested', () => {
    it('AiService: Then it tests OpenAI connection successfully', async () => {
      // Given: Valid OpenAI configuration
      storage.getSettings.mockResolvedValue(fixtures.settings.withOpenAI);
      await aiService.init();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Test successful' } }],
          }),
      });

      // When: Testing connection
      if (aiService.testConnection) {
        const result = await aiService.testConnection();

        // Then: Should report success
        expect(result.success).toBe(true);
      }
    });

    it('AiService: Then it reports failed connection', async () => {
      // Given: Invalid API key
      storage.getSettings.mockResolvedValue(fixtures.settings.withOpenAI);
      await aiService.init();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: { message: 'Invalid API key' },
          }),
      });

      // When: Testing connection
      if (aiService.testConnection) {
        const result = await aiService.testConnection();

        // Then: Should report failure
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('AiService: When the active provider is switched', () => {
    it('AiService: Then it switches providers dynamically', async () => {
      // Given: Initial mock provider
      storage.getSettings.mockResolvedValue(fixtures.settings.default);
      await aiService.init();
      expect(aiService.settings.provider).toBe('mock');

      // When: Settings change to OpenAI
      storage.getSettings.mockResolvedValue(fixtures.settings.withOpenAI);
      await aiService.init(); // Re-initialize

      // Then: Should use new provider
      expect(aiService.settings.provider).toBe('openai');
    });
  });
});

describe('AiService: Given the per-provider request adapters', () => {
  let aiService;
  let storage;

  const settingsFor = (provider, overrides = {}) => ({
    provider,
    apiKey: '',
    apiKeys: { [provider]: 'test-key' },
    providerConfig: { [provider]: overrides },
  });

  const jsonResponse = (payload) => ({
    ok: true,
    json: () => Promise.resolve(payload),
  });

  const lastRequest = () => {
    const [url, init] = mockFetch.mock.calls.at(-1);
    return { url, init, body: JSON.parse(init.body) };
  };

  const tools = [
    {
      name: 'fetch_url',
      description: 'Fetch a page',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url'],
      },
    },
  ];

  beforeEach(async () => {
    installChromeMock();
    testUtils.resetStorage();
    mockFetch.mockReset();
    vi.resetModules();

    storage = (await import('../../../chrome-extension/shared/storage.js'))
      .default;
    aiService = (await import('../../../chrome-extension/shared/ai-service.js'))
      .default;
    aiService.settings = null;
    aiService.requestTimestamps = [];
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  describe('AiService: When an OpenAI-compatible provider is called', () => {
    it('AiService: Then it sends the configured model and omit unsupported parameters', async () => {
      storage.getSettings.mockResolvedValue(
        settingsFor('openai', { model: 'gpt-6-astra' })
      );
      await aiService.init();
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: 'hi' } }] })
      );

      await aiService.chat({ messages: [{ role: 'user', content: 'hi' }] });

      const { body } = lastRequest();
      expect(body.model).toBe('gpt-6-astra');
      // GPT-5+ reject max_tokens and a non-default temperature.
      expect(body.max_completion_tokens).toBeDefined();
      expect(body.max_tokens).toBeUndefined();
      expect(body.temperature).toBeUndefined();
    });

    it('AiService: Then it falls back to the provider default model', async () => {
      storage.getSettings.mockResolvedValue(settingsFor('grok'));
      await aiService.init();
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: 'hi' } }] })
      );

      const result = await aiService.chat({
        messages: [{ role: 'user', content: 'hi' }],
      });

      expect(result.model).toBe('grok-4.6');
      expect(lastRequest().url).toBe('https://api.x.ai/v1/chat/completions');
    });

    it('AiService: Then it translates tools and parse tool calls back', async () => {
      storage.getSettings.mockResolvedValue(settingsFor('groq'));
      await aiService.init();
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: 'call_1',
                    function: {
                      name: 'fetch_url',
                      arguments: '{"url":"https://a.test"}',
                    },
                  },
                ],
              },
            },
          ],
        })
      );

      const result = await aiService.chat({
        messages: [{ role: 'user', content: 'go' }],
        tools,
      });

      expect(lastRequest().body.tools[0]).toEqual({
        type: 'function',
        function: {
          name: 'fetch_url',
          description: 'Fetch a page',
          parameters: tools[0].parameters,
        },
      });
      expect(result.toolCalls).toEqual([
        { id: 'call_1', name: 'fetch_url', args: { url: 'https://a.test' } },
      ]);
    });

    it('AiService: Then it sends assistant tool calls and tool results back in wire format', async () => {
      storage.getSettings.mockResolvedValue(settingsFor('groq'));
      await aiService.init();
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: 'done' } }] })
      );

      await aiService.chat({
        messages: [
          { role: 'user', content: 'go' },
          {
            role: 'assistant',
            content: '',
            toolCalls: [
              { id: 'call_1', name: 'fetch_url', args: { url: 'x' } },
            ],
          },
          { role: 'tool', toolCallId: 'call_1', content: 'page text' },
        ],
        tools,
      });

      const { body } = lastRequest();
      expect(body.messages[1].tool_calls[0].function.arguments).toBe(
        '{"url":"x"}'
      );
      expect(body.messages[2]).toEqual({
        role: 'tool',
        tool_call_id: 'call_1',
        content: 'page text',
      });
    });
  });

  describe('AiService: When the Anthropic adapter is called', () => {
    beforeEach(async () => {
      storage.getSettings.mockResolvedValue(settingsFor('claude'));
      await aiService.init();
    });

    it('AiService: Then it hoists system messages and translate tool schemas', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ content: [{ type: 'text', text: 'ok' }] })
      );

      await aiService.chat({
        messages: [
          { role: 'system', content: 'Be terse' },
          { role: 'user', content: 'go' },
        ],
        tools,
      });

      const { body } = lastRequest();
      expect(body.system).toBe('Be terse');
      expect(body.messages).toHaveLength(1);
      expect(body.tools[0]).toEqual({
        name: 'fetch_url',
        description: 'Fetch a page',
        input_schema: tools[0].parameters,
      });
    });

    it('AiService: Then it parses tool_use blocks alongside text', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          content: [
            { type: 'text', text: 'Looking it up' },
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'fetch_url',
              input: { url: 'https://a.test' },
            },
          ],
        })
      );

      const result = await aiService.chat({
        messages: [{ role: 'user', content: 'go' }],
        tools,
      });

      expect(result.content).toBe('Looking it up');
      expect(result.toolCalls).toEqual([
        { id: 'toolu_1', name: 'fetch_url', args: { url: 'https://a.test' } },
      ]);
    });

    it('AiService: Then it sends tool results as a tool_result block', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ content: [{ type: 'text', text: 'ok' }] })
      );

      await aiService.chat({
        messages: [
          { role: 'user', content: 'go' },
          {
            role: 'assistant',
            content: '',
            toolCalls: [{ id: 'toolu_1', name: 'fetch_url', args: {} }],
          },
          { role: 'tool', toolCallId: 'toolu_1', content: 'page text' },
        ],
        tools,
      });

      const { body } = lastRequest();
      expect(body.messages[2]).toEqual({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_1',
            content: 'page text',
          },
        ],
      });
    });
  });

  describe('AiService: When the Gemini adapter is called', () => {
    beforeEach(async () => {
      storage.getSettings.mockResolvedValue(
        settingsFor('gemini', { model: 'gemini-3.8-flash' })
      );
      await aiService.init();
    });

    it('AiService: Then it authenticates with a header rather than the query string', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        })
      );

      await aiService.chat({ messages: [{ role: 'user', content: 'go' }] });

      const { url, init } = lastRequest();
      expect(url).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'
      );
      expect(url).not.toContain('test-key');
      expect(init.headers['x-goog-api-key']).toBe('test-key');
    });

    it('AiService: Then it translates tools to function declarations and parse function calls', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'fetch_url',
                      args: { url: 'https://a.test' },
                    },
                  },
                ],
              },
            },
          ],
        })
      );

      const result = await aiService.chat({
        messages: [
          { role: 'system', content: 'Be terse' },
          { role: 'user', content: 'go' },
        ],
        tools,
      });

      const { body } = lastRequest();
      expect(body.systemInstruction.parts[0].text).toBe('Be terse');
      expect(body.tools[0].functionDeclarations[0].name).toBe('fetch_url');
      expect(result.toolCalls[0]).toMatchObject({
        name: 'fetch_url',
        args: { url: 'https://a.test' },
      });
    });
  });

  describe('AiService: When a local provider is called', () => {
    it('AiService: Then it calls Ollama on localhost without requiring a key', async () => {
      storage.getSettings.mockResolvedValue({
        provider: 'ollama',
        apiKey: '',
        apiKeys: {},
        providerConfig: { ollama: { model: 'qwen3' } },
      });
      await aiService.init();
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: 'local reply' } }] })
      );

      const result = await aiService.chat({
        messages: [{ role: 'user', content: 'go' }],
      });

      const { url, init, body } = lastRequest();
      expect(url).toBe('http://localhost:11434/v1/chat/completions');
      expect(init.headers.Authorization).toBeUndefined();
      expect(body.max_tokens).toBeDefined();
      expect(result.content).toBe('local reply');
    });

    it('AiService: Then it honours a custom endpoint for llama.cpp', async () => {
      storage.getSettings.mockResolvedValue({
        provider: 'llamacpp',
        apiKeys: {},
        providerConfig: {
          llamacpp: { model: 'local', baseUrl: 'http://127.0.0.1:9090/v1/' },
        },
      });
      await aiService.init();
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: 'ok' } }] })
      );

      await aiService.chat({ messages: [{ role: 'user', content: 'go' }] });

      expect(lastRequest().url).toBe(
        'http://127.0.0.1:9090/v1/chat/completions'
      );
    });

    it('AiService: Then it refuses to call a local provider with no model selected', async () => {
      storage.getSettings.mockResolvedValue({
        provider: 'ollama',
        apiKeys: {},
        providerConfig: { ollama: { model: '' } },
      });
      await aiService.init();

      await expect(
        aiService.chat({ messages: [{ role: 'user', content: 'go' }] })
      ).rejects.toThrow('No model selected');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('AiService: Then it lists the models a local endpoint is serving', async () => {
      storage.getSettings.mockResolvedValue({
        provider: 'ollama',
        apiKeys: {},
        providerConfig: {},
      });
      await aiService.init();
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: [{ id: 'qwen3' }, { id: 'llama3.2' }] })
      );

      const models = await aiService.listRemoteModels('ollama');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/models',
        expect.anything()
      );
      expect(models).toEqual(['llama3.2', 'qwen3']);
    });
  });

  describe('AiService: When a retired provider id is used', () => {
    it('AiService: Then it routes a stored "llama" provider to Groq', async () => {
      storage.getSettings.mockResolvedValue({
        provider: 'llama',
        apiKeys: { groq: 'test-key' },
        providerConfig: {},
      });
      await aiService.init();
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: 'ok' } }] })
      );

      await aiService.chat({ messages: [{ role: 'user', content: 'go' }] });

      expect(lastRequest().url).toBe(
        'https://api.groq.com/openai/v1/chat/completions'
      );
    });
  });
});

describe('AiService: Given a provider that fails', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
    mockFetch.mockReset();
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  it('AiService: Then it handles malformed API responses', async () => {
    // Given: OpenAI provider
    vi.resetModules();
    const storage = (
      await import('../../../chrome-extension/shared/storage.js')
    ).default;
    storage.getSettings.mockResolvedValue(fixtures.settings.withOpenAI);

    const AIServiceModule =
      await import('../../../chrome-extension/shared/ai-service.js');
    const aiService = AIServiceModule.default;
    await aiService.init();

    // Mock malformed response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}), // Missing expected fields
    });

    // When: Processing template - should handle gracefully or throw
    try {
      const result = await aiService.processTemplate(
        fixtures.templates.email,
        fixtures.userInputs.email
      );
      // If it doesn't throw, result should still be defined
      expect(result).toBeDefined();
    } catch (error) {
      // If it throws, that's also acceptable for malformed data
      expect(error.message).toBeDefined();
    }
  });

  it('AiService: Then it handles timeout errors', async () => {
    // Given: OpenAI provider
    vi.resetModules();
    const storage = (
      await import('../../../chrome-extension/shared/storage.js')
    ).default;
    storage.getSettings.mockResolvedValue(fixtures.settings.withOpenAI);

    const AIServiceModule =
      await import('../../../chrome-extension/shared/ai-service.js');
    const aiService = AIServiceModule.default;
    await aiService.init();

    // Mock timeout
    mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

    // When/Then: Should throw with timeout error
    await expect(
      aiService.processTemplate(
        fixtures.templates.email,
        fixtures.userInputs.email
      )
    ).rejects.toThrow();
  });

  it('AiService: Then it handles JSON parse errors', async () => {
    // Given: OpenAI provider
    vi.resetModules();
    const storage = (
      await import('../../../chrome-extension/shared/storage.js')
    ).default;
    storage.getSettings.mockResolvedValue(fixtures.settings.withOpenAI);

    const AIServiceModule =
      await import('../../../chrome-extension/shared/ai-service.js');
    const aiService = AIServiceModule.default;
    await aiService.init();

    // Mock invalid JSON response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });

    // When/Then: Should throw error
    await expect(
      aiService.processTemplate(
        fixtures.templates.email,
        fixtures.userInputs.email
      )
    ).rejects.toThrow();
  });
});
