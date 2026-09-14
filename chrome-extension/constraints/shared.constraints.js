// Boundaries owned by the shared/ module: what external code may import
// from it, and which directories are held to that.

// The only paths external code may import out of shared/.
export const SHARED_PUBLIC_ENTRIES = [
  '../shared/index.js',
  '../shared/components/index.js',
];

// Directories that must go through SHARED_PUBLIC_ENTRIES.
export const SHARED_CONSUMERS = [
  'chrome-extension/background/**/*.js',
  'chrome-extension/sidepanel/**/*.js',
  'chrome-extension/settings/**/*.js',
  'chrome-extension/content/**/*.js',
];
