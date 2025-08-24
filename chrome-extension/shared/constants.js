export const STORAGE_KEYS = {
  TEMPLATES: 'templates',
  HISTORY: 'history',
  SETTINGS: 'settings'
};

export const AI_PROVIDERS = {
  MOCK: 'mock',
  OPENAI: 'openai',
  CLAUDE: 'claude',
  GEMINI: 'gemini',
  LLAMA: 'llama',
  GROK: 'grok'
};

export const TEMPLATE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export const HISTORY_STATUS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  PROCESSING: 'processing'
};

export const DEFAULT_SETTINGS = {
  apiKey: '',
  provider: AI_PROVIDERS.MOCK,
  defaultProvider: AI_PROVIDERS.MOCK,
  theme: 'auto'
};

export const LIMITS = {
  MAX_TEMPLATES: 50,
  MAX_HISTORY_ENTRIES: 100,
  MAX_TEMPLATE_NAME_LENGTH: 50,
  MAX_TEMPLATE_DESCRIPTION_LENGTH: 200,
  MAX_TEMPLATE_PROMPT_LENGTH: 2000,
  STORAGE_CHUNK_SIZE: 7000 // Chrome storage sync item limit is 8KB
};

export const EVENTS = {
  TEMPLATE_CREATED: 'template-created',
  TEMPLATE_UPDATED: 'template-updated',
  TEMPLATE_DELETED: 'template-deleted',
  TEMPLATE_EXECUTED: 'template-executed',
  HISTORY_UPDATED: 'history-updated',
  SETTINGS_UPDATED: 'settings-updated'
};

export const MOCK_RESPONSES = [
  "This is a mock AI response. The actual AI integration would process your template here.",
  "Mock AI processing complete. Your template has been successfully processed with placeholder content.",
  "Simulated AI response: Your request has been handled by the mock AI service for development purposes.",
  "Demo response: This shows how the AI would transform your template inputs into meaningful output."
];