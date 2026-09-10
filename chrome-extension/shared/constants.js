import { AI_PROVIDERS, PROVIDERS, PROVIDER_IDS } from './providers.js';

export const EXTENSION_VERSION = '1.1.0';

export const STORAGE_KEYS = {
  TEMPLATES: 'templates',
  WORKFLOWS: 'workflows',
  HISTORY: 'history',
  SETTINGS: 'settings',
  TEMPLATES_SEEDED: 'templates_seeded',
  WORKFLOWS_SEEDED: 'workflows_seeded',
  LAST_ACTIVE_SECTION: 'last_active_section',
  LAST_ACTIVE_PAGE: 'last_active_page',
};

// Re-exported so existing imports keep working; providers.js is the source.
export { AI_PROVIDERS };

export const WORKFLOW_STEP_TYPES = {
  PROMPT: 'prompt',
  AGENT: 'agent',
  TEMPLATE: 'template',
};

export const RUN_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

export const TEMPLATE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const HISTORY_STATUS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  PROCESSING: 'processing',
};

// One empty slot per known provider, so settings.apiKeys always has the full
// shape regardless of which providers existed when the settings were written.
export const EMPTY_API_KEYS = Object.fromEntries(
  PROVIDER_IDS.map((id) => [id, ''])
);

// Per-provider model / endpoint overrides, seeded from the registry defaults.
export const DEFAULT_PROVIDER_CONFIG = Object.fromEntries(
  PROVIDER_IDS.map((id) => [
    id,
    { model: PROVIDERS[id].defaultModel || '', baseUrl: '' },
  ])
);

export const DEFAULT_SETTINGS = {
  apiKey: '', // Legacy field, kept for backward compatibility
  provider: AI_PROVIDERS.MOCK,
  defaultProvider: AI_PROVIDERS.MOCK,
  theme: 'auto',
  // API keys stored per provider
  apiKeys: { ...EMPTY_API_KEYS },
  providerConfig: structuredClone(DEFAULT_PROVIDER_CONFIG),
};

export const LIMITS = {
  MAX_TEMPLATES: 50,
  MAX_WORKFLOWS: 20,
  MAX_WORKFLOW_STEPS: 8,
  MAX_AGENT_ITERATIONS: 10,
  DEFAULT_AGENT_ITERATIONS: 5,
  MAX_HISTORY_ENTRIES: 100,
  MAX_TEMPLATE_NAME_LENGTH: 50,
  MAX_TEMPLATE_DESCRIPTION_LENGTH: 200,
  MAX_TEMPLATE_PROMPT_LENGTH: 2000,
  MAX_TOOL_OUTPUT_CHARS: 8000,
  STORAGE_CHUNK_SIZE: 7000, // Chrome storage sync item limit is 8KB
};

export const EVENTS = {
  TEMPLATE_CREATED: 'template-created',
  TEMPLATE_UPDATED: 'template-updated',
  TEMPLATE_DELETED: 'template-deleted',
  TEMPLATE_EXECUTED: 'template-executed',
  HISTORY_UPDATED: 'history-updated',
  SETTINGS_UPDATED: 'settings-updated',
  WORKFLOW_CREATED: 'workflow-created',
  WORKFLOW_UPDATED: 'workflow-updated',
  WORKFLOW_DELETED: 'workflow-deleted',
};

export const MOCK_RESPONSES = [
  'This is a mock AI response. The actual AI integration would process your template here.',
  'Mock AI processing complete. Your template has been successfully processed with placeholder content.',
  'Simulated AI response: Your request has been handled by the mock AI service for development purposes.',
  'Demo response: This shows how the AI would transform your template inputs into meaningful output.',
];
