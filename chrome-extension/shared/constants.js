import { AI_PROVIDERS, PROVIDERS, PROVIDER_IDS } from './providers.js';
import {
  MAX_TEMPLATES,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_PROMPT_LENGTH,
} from '../constraints/template.constraints.js';
import {
  MAX_WORKFLOWS,
  MAX_WORKFLOW_STEPS,
} from '../constraints/workflow.constraints.js';
import {
  MAX_AGENT_ITERATIONS,
  DEFAULT_AGENT_ITERATIONS,
  MAX_TOOL_OUTPUT_CHARS,
} from '../constraints/agent.constraints.js';
import { MAX_HISTORY_ENTRIES } from '../constraints/history.constraints.js';
import {
  STORAGE_CHUNK_SIZE,
  STORAGE_KEYS,
} from '../constraints/storage.constraints.js';

export { EXTENSION_VERSION } from '../constraints/version.constraints.js';
export { STORAGE_KEYS };

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

// Aggregated for the app's existing call sites; every value is declared
// once in constraints/ and only re-exported here.
export const LIMITS = {
  MAX_TEMPLATES,
  MAX_WORKFLOWS,
  MAX_WORKFLOW_STEPS,
  MAX_AGENT_ITERATIONS,
  DEFAULT_AGENT_ITERATIONS,
  MAX_HISTORY_ENTRIES,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_PROMPT_LENGTH,
  MAX_TOOL_OUTPUT_CHARS,
  STORAGE_CHUNK_SIZE,
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
