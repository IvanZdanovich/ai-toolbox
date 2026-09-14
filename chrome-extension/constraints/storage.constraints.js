// Boundaries owned by the storage layer: the keys it owns and the chunk
// size it splits large values into.

// Chrome's storage.sync per-item limit is 8KB; stay under it with headroom
// for the chunk wrapper.
export const STORAGE_CHUNK_SIZE = 7000;

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
