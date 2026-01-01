/**
 * Chrome API Mock for Testing
 * Provides a complete mock of the Chrome Extension API
 */

// In-memory storage
const mockStorage = {
  sync: new Map(),
  local: new Map(),
};

// Event listeners registry
const eventListeners = new Map();

/**
 * Create a mock event object with addListener/removeListener
 */
function createMockEvent(name) {
  const listeners = [];
  return {
    addListener: (callback) => {
      listeners.push(callback);
      eventListeners.set(name, listeners);
    },
    removeListener: (callback) => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    },
    hasListener: (callback) => listeners.includes(callback),
    // Test helper to trigger the event
    _trigger: (...args) => {
      listeners.forEach((cb) => cb(...args));
    },
    _listeners: listeners,
  };
}

/**
 * Create mock storage area (sync or local)
 */
function createMockStorageArea(storageMap) {
  return {
    get: (keys, callback) => {
      const result = {};
      if (keys === null) {
        storageMap.forEach((value, key) => {
          result[key] = value;
        });
      } else if (typeof keys === 'string') {
        if (storageMap.has(keys)) {
          result[keys] = storageMap.get(keys);
        }
      } else if (Array.isArray(keys)) {
        keys.forEach((key) => {
          if (storageMap.has(key)) {
            result[key] = storageMap.get(key);
          }
        });
      } else if (typeof keys === 'object') {
        Object.keys(keys).forEach((key) => {
          result[key] = storageMap.has(key) ? storageMap.get(key) : keys[key];
        });
      }
      if (callback) callback(result);
      return Promise.resolve(result);
    },

    set: (items, callback) => {
      Object.entries(items).forEach(([key, value]) => {
        storageMap.set(key, value);
      });
      if (callback) callback();
      return Promise.resolve();
    },

    remove: (keys, callback) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach((key) => storageMap.delete(key));
      if (callback) callback();
      return Promise.resolve();
    },

    clear: (callback) => {
      storageMap.clear();
      if (callback) callback();
      return Promise.resolve();
    },

    getBytesInUse: (keys, callback) => {
      let size = 0;
      storageMap.forEach((value) => {
        size += JSON.stringify(value).length;
      });
      if (callback) callback(size);
      return Promise.resolve(size);
    },

    QUOTA_BYTES: 102400, // 100KB
    QUOTA_BYTES_PER_ITEM: 8192, // 8KB
  };
}

/**
 * Main Chrome API Mock
 */
export const chromeMock = {
  storage: {
    sync: createMockStorageArea(mockStorage.sync),
    local: createMockStorageArea(mockStorage.local),
    onChanged: createMockEvent('storage.onChanged'),
  },

  runtime: {
    id: 'mock-extension-id',
    getURL: (path) => `chrome-extension://mock-extension-id/${path}`,
    getManifest: () => ({
      manifest_version: 3,
      name: 'AI Toolbox',
      version: '0.9.0',
    }),
    sendMessage: (message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    },
    onMessage: createMockEvent('runtime.onMessage'),
    onInstalled: createMockEvent('runtime.onInstalled'),
    onStartup: createMockEvent('runtime.onStartup'),
    lastError: null,
  },

  tabs: {
    query: (queryInfo, callback) => {
      const tabs = [{ id: 1, url: 'https://example.com', active: true }];
      if (callback) callback(tabs);
      return Promise.resolve(tabs);
    },
    sendMessage: (tabId, message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    },
    create: (createProperties, callback) => {
      const tab = { id: Date.now(), ...createProperties };
      if (callback) callback(tab);
      return Promise.resolve(tab);
    },
    onRemoved: createMockEvent('tabs.onRemoved'),
  },

  contextMenus: {
    create: (createProperties, callback) => {
      if (callback) callback();
    },
    update: (id, updateProperties, callback) => {
      if (callback) callback();
    },
    remove: (menuItemId, callback) => {
      if (callback) callback();
    },
    removeAll: (callback) => {
      if (callback) callback();
      return Promise.resolve();
    },
    onClicked: createMockEvent('contextMenus.onClicked'),
  },

  action: {
    setBadgeText: (details, callback) => {
      if (callback) callback();
    },
    setBadgeBackgroundColor: (details, callback) => {
      if (callback) callback();
    },
    onClicked: createMockEvent('action.onClicked'),
  },

  notifications: {
    create: (notificationId, options, callback) => {
      if (callback) callback(notificationId);
    },
    clear: (notificationId, callback) => {
      if (callback) callback(true);
    },
  },

  sidePanel: {
    open: (options) => Promise.resolve(),
    setPanelBehavior: (behavior) => Promise.resolve(),
  },

  i18n: {
    getMessage: (messageName, substitutions) => messageName,
    getUILanguage: () => 'en',
  },
};

/**
 * Test Utilities
 */
export const testUtils = {
  // Reset all mock storage
  resetStorage: () => {
    mockStorage.sync.clear();
    mockStorage.local.clear();
  },

  // Get current storage state (for assertions)
  getStorageState: (area = 'sync') => {
    const map = area === 'sync' ? mockStorage.sync : mockStorage.local;
    return Object.fromEntries(map);
  },

  // Set storage state (for setup)
  setStorageState: (state, area = 'sync') => {
    const map = area === 'sync' ? mockStorage.sync : mockStorage.local;
    map.clear();
    Object.entries(state).forEach(([key, value]) => {
      map.set(key, value);
    });
  },

  // Trigger an event
  triggerEvent: (eventPath, ...args) => {
    const listeners = eventListeners.get(eventPath);
    if (listeners) {
      listeners.forEach((cb) => cb(...args));
    }
  },

  // Wait for async operations
  waitFor: (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Create a spy function
  createSpy: (returnValue) => {
    const calls = [];
    const fn = (...args) => {
      calls.push(args);
      return typeof returnValue === 'function'
        ? returnValue(...args)
        : returnValue;
    };
    fn.calls = calls;
    fn.callCount = () => calls.length;
    fn.lastCall = () => calls[calls.length - 1];
    fn.reset = () => {
      calls.length = 0;
    };
    return fn;
  },
};

/**
 * Install mock globally
 */
export function installChromeMock() {
  globalThis.chrome = chromeMock;
  return chromeMock;
}

/**
 * Uninstall mock
 */
export function uninstallChromeMock() {
  delete globalThis.chrome;
}

export default chromeMock;
