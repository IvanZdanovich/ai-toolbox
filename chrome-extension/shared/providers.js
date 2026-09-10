/**
 * Provider registry.
 *
 * Every provider declares which wire protocol it speaks (`kind`) plus the
 * endpoint/model metadata the UI needs. ai-service.js owns the three adapters
 * that translate the neutral message/tool shape into each protocol, so adding a
 * provider here is enough for it to work everywhere, agent tool-calling
 * included.
 */

export const PROVIDER_KIND = {
  MOCK: 'mock',
  // OpenAI /chat/completions — also spoken by Ollama, llama.cpp, LM Studio,
  // Groq, Mistral, DeepSeek, xAI and OpenRouter.
  OPENAI: 'openai-chat',
  ANTHROPIC: 'anthropic-messages',
  GEMINI: 'gemini-generate',
};

export const AI_PROVIDERS = {
  MOCK: 'mock',
  OPENAI: 'openai',
  CLAUDE: 'claude',
  GEMINI: 'gemini',
  GROK: 'grok',
  MISTRAL: 'mistral',
  DEEPSEEK: 'deepseek',
  GROQ: 'groq',
  OPENROUTER: 'openrouter',
  OLLAMA: 'ollama',
  LLAMACPP: 'llamacpp',
  LMSTUDIO: 'lmstudio',
  CUSTOM: 'custom',
};

// Providers that were removed or renamed, mapped to their replacement so
// stored settings keep working after an update.
export const LEGACY_PROVIDER_ALIASES = {
  llama: AI_PROVIDERS.GROQ,
  anthropic: AI_PROVIDERS.CLAUDE,
  google: AI_PROVIDERS.GEMINI,
  xai: AI_PROVIDERS.GROK,
};

export const PROVIDERS = {
  [AI_PROVIDERS.MOCK]: {
    id: AI_PROVIDERS.MOCK,
    name: 'Mock AI (Demo)',
    description: 'Simulated responses for testing and demos — no key required',
    kind: PROVIDER_KIND.MOCK,
    requiresApiKey: false,
    supportsTools: true,
    models: [],
    defaultModel: '',
  },

  [AI_PROVIDERS.OPENAI]: {
    id: AI_PROVIDERS.OPENAI,
    name: 'OpenAI',
    description: 'GPT-6 and GPT-5.x models from OpenAI',
    kind: PROVIDER_KIND.OPENAI,
    baseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    supportsTools: true,
    // GPT-5+ reject `max_tokens` and any temperature other than the default.
    maxTokensParam: 'max_completion_tokens',
    supportsTemperature: false,
    models: [
      'gpt-6-astra',
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'gpt-5.6-luna',
      'gpt-5.4-mini',
      'gpt-5.4-nano',
    ],
    defaultModel: 'gpt-5.6-terra',
  },

  [AI_PROVIDERS.CLAUDE]: {
    id: AI_PROVIDERS.CLAUDE,
    name: 'Anthropic Claude',
    description: 'Claude Opus 5, Sonnet 5, Fable 5 and Haiku 4.5',
    kind: PROVIDER_KIND.ANTHROPIC,
    baseUrl: 'https://api.anthropic.com/v1',
    apiVersion: '2023-06-01',
    requiresApiKey: true,
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    supportsTools: true,
    models: [
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-fable-5',
      'claude-haiku-4-5',
    ],
    defaultModel: 'claude-sonnet-5',
  },

  [AI_PROVIDERS.GEMINI]: {
    id: AI_PROVIDERS.GEMINI,
    name: 'Google Gemini',
    description: 'Gemini 3.x — fast, multimodal, long context',
    kind: PROVIDER_KIND.GEMINI,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    supportsTools: true,
    models: [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-pro-preview',
    ],
    defaultModel: 'gemini-3.6-flash',
  },

  [AI_PROVIDERS.GROK]: {
    id: AI_PROVIDERS.GROK,
    name: 'xAI Grok',
    description: 'Grok 4.x — real-time knowledge and long-running agents',
    kind: PROVIDER_KIND.OPENAI,
    baseUrl: 'https://api.x.ai/v1',
    requiresApiKey: true,
    apiKeyUrl: 'https://console.x.ai/',
    supportsTools: true,
    models: ['grok-4.6', 'grok-4.3'],
    defaultModel: 'grok-4.6',
  },

  [AI_PROVIDERS.MISTRAL]: {
    id: AI_PROVIDERS.MISTRAL,
    name: 'Mistral AI',
    description: 'Mistral Medium/Large/Small and Codestral',
    kind: PROVIDER_KIND.OPENAI,
    baseUrl: 'https://api.mistral.ai/v1',
    requiresApiKey: true,
    apiKeyUrl: 'https://console.mistral.ai/api-keys',
    supportsTools: true,
    models: [
      'mistral-medium-3-5-26-04',
      'mistral-large-3-25-12',
      'mistral-small-4-0-26-03',
      'codestral-25-08',
    ],
    defaultModel: 'mistral-medium-3-5-26-04',
  },

  [AI_PROVIDERS.DEEPSEEK]: {
    id: AI_PROVIDERS.DEEPSEEK,
    name: 'DeepSeek',
    description: 'DeepSeek V4 — strong reasoning at low cost',
    kind: PROVIDER_KIND.OPENAI,
    baseUrl: 'https://api.deepseek.com/v1',
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    supportsTools: true,
    models: ['deepseek-flash'],
    defaultModel: 'deepseek-flash',
  },

  [AI_PROVIDERS.GROQ]: {
    id: AI_PROVIDERS.GROQ,
    name: 'Groq',
    description: 'Llama and GPT-OSS models at very high throughput',
    kind: PROVIDER_KIND.OPENAI,
    baseUrl: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    apiKeyUrl: 'https://console.groq.com/keys',
    supportsTools: true,
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'groq/compound',
      'groq/compound-mini',
    ],
    defaultModel: 'llama-3.3-70b-versatile',
  },

  [AI_PROVIDERS.OPENROUTER]: {
    id: AI_PROVIDERS.OPENROUTER,
    name: 'OpenRouter',
    description: 'One key, hundreds of models routed across providers',
    kind: PROVIDER_KIND.OPENAI,
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    apiKeyUrl: 'https://openrouter.ai/keys',
    supportsTools: true,
    supportsModelListing: true,
    models: [
      'anthropic/claude-sonnet-5',
      'openai/gpt-6-astra',
      'google/gemini-3.8-flash',
      'deepseek/deepseek-flash',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    defaultModel: 'anthropic/claude-sonnet-5',
  },

  [AI_PROVIDERS.OLLAMA]: {
    id: AI_PROVIDERS.OLLAMA,
    name: 'Ollama (local)',
    description: 'Models running locally via Ollama — nothing leaves your machine',
    kind: PROVIDER_KIND.OPENAI,
    baseUrl: 'http://localhost:11434/v1',
    local: true,
    requiresApiKey: false,
    configurableBaseUrl: true,
    supportsTools: true,
    supportsModelListing: true,
    setupUrl: 'https://docs.ollama.com/api/openai-compatibility',
    models: [],
    defaultModel: '',
  },

  [AI_PROVIDERS.LLAMACPP]: {
    id: AI_PROVIDERS.LLAMACPP,
    name: 'llama.cpp (local)',
    description: 'A local llama-server instance (llama.cpp)',
    kind: PROVIDER_KIND.OPENAI,
    baseUrl: 'http://localhost:8080/v1',
    local: true,
    requiresApiKey: false,
    configurableBaseUrl: true,
    supportsTools: true,
    supportsModelListing: true,
    setupUrl: 'https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md',
    models: [],
    defaultModel: '',
  },

  [AI_PROVIDERS.LMSTUDIO]: {
    id: AI_PROVIDERS.LMSTUDIO,
    name: 'LM Studio (local)',
    description: 'Models served by a local LM Studio server',
    kind: PROVIDER_KIND.OPENAI,
    baseUrl: 'http://localhost:1234/v1',
    local: true,
    requiresApiKey: false,
    configurableBaseUrl: true,
    supportsTools: true,
    supportsModelListing: true,
    setupUrl: 'https://lmstudio.ai/docs/app/api/endpoints/openai',
    models: [],
    defaultModel: '',
  },

  [AI_PROVIDERS.CUSTOM]: {
    id: AI_PROVIDERS.CUSTOM,
    name: 'Custom (OpenAI-compatible)',
    description: 'Any endpoint that speaks the OpenAI chat completions API',
    kind: PROVIDER_KIND.OPENAI,
    baseUrl: '',
    requiresApiKey: false,
    configurableBaseUrl: true,
    supportsTools: true,
    supportsModelListing: true,
    models: [],
    defaultModel: '',
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS);

// Resolves legacy ids and unknown values to something usable.
export function normalizeProviderId(id) {
  if (PROVIDERS[id]) {
    return id;
  }
  return LEGACY_PROVIDER_ALIASES[id] || AI_PROVIDERS.MOCK;
}

export function getProvider(id) {
  return PROVIDERS[normalizeProviderId(id)];
}

export function listProviders() {
  return PROVIDER_IDS.map((id) => PROVIDERS[id]);
}