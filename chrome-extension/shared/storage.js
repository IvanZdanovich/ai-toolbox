import { STORAGE_KEYS, DEFAULT_SETTINGS, LIMITS } from './constants.js';

class ChromeStorage {
  constructor() {
    this.storage = chrome.storage.sync;
    this.cache = new Map();
  }

  async get(key) {
    if (this.cache.has(key)) {
      console.debug(`Storage: Retrieved ${key} from cache`);
      return this.cache.get(key);
    }

    try {
      const result = await this.storage.get(key);
      const value = result[key];

      if (value !== undefined) {
        this.cache.set(key, value);
        console.debug(
          `Storage: Retrieved ${key} from storage, cached for future use`
        );
      } else {
        console.debug(`Storage: No value found for ${key}`);
      }

      return value;
    } catch (error) {
      console.error(`Failed to get ${key} from storage:`, error);
      return null;
    }
  }

  async set(key, value) {
    try {
      const data = { [key]: value };

      const serialized = JSON.stringify(data);
      console.debug(
        `Storage: Setting ${key}, size: ${serialized.length} bytes`
      );

      // Only one representation may exist at a time: getTemplates()/getHistory()
      // read the plain key first, so a stale one would shadow the chunks.
      if (serialized.length > LIMITS.STORAGE_CHUNK_SIZE) {
        console.debug(`Storage: Using chunked storage for ${key}`);
        await this.setChunked(key, value);
        await this.storage.remove(key);
      } else {
        await this.storage.set(data);
        await this.removeChunks(key);
      }

      this.cache.set(key, value);
      console.debug(`Storage: Successfully saved ${key}`);
      return true;
    } catch (error) {
      console.error(`Failed to set ${key} in storage:`, error);
      return false;
    }
  }

  async setChunked(key, value) {
    // Drop any previous chunks first so a shorter value can't leave orphans.
    await this.removeChunks(key);

    const serialized = JSON.stringify(value);
    const chunkSize = LIMITS.STORAGE_CHUNK_SIZE;
    const chunks = [];

    for (let i = 0; i < serialized.length; i += chunkSize) {
      chunks.push(serialized.substring(i, i + chunkSize));
    }

    const chunkData = {};
    chunks.forEach((chunk, index) => {
      chunkData[`${key}_chunk_${index}`] = chunk;
    });

    chunkData[`${key}_chunks`] = chunks.length;

    await this.storage.set(chunkData);
  }

  // Removes the chunk keys for `key`, leaving the plain key untouched.
  async removeChunks(key) {
    const chunkCountResult = await this.storage.get(`${key}_chunks`);
    const chunkCount = chunkCountResult[`${key}_chunks`];

    if (!chunkCount) {
      return;
    }

    const keysToRemove = [`${key}_chunks`];
    for (let i = 0; i < chunkCount; i++) {
      keysToRemove.push(`${key}_chunk_${i}`);
    }

    await this.storage.remove(keysToRemove);
  }

  async getChunked(key) {
    try {
      const chunkCountResult = await this.storage.get(`${key}_chunks`);
      const chunkCount = chunkCountResult[`${key}_chunks`];

      if (!chunkCount) {
        return null;
      }

      const chunkKeys = [];
      for (let i = 0; i < chunkCount; i++) {
        chunkKeys.push(`${key}_chunk_${i}`);
      }

      const chunksResult = await this.storage.get(chunkKeys);

      let serialized = '';
      for (let i = 0; i < chunkCount; i++) {
        const chunkKey = `${key}_chunk_${i}`;
        serialized += chunksResult[chunkKey] || '';
      }

      return JSON.parse(serialized);
    } catch (error) {
      console.error(`Failed to get chunked data for ${key}:`, error);
      return null;
    }
  }

  async remove(key) {
    try {
      await this.removeChunks(key);
      await this.storage.remove(key);
      this.cache.delete(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove ${key} from storage:`, error);
      return false;
    }
  }

  async clear() {
    try {
      await this.storage.clear();
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  async getStorageInfo() {
    try {
      const bytesInUse = await new Promise((resolve) => {
        chrome.storage.sync.getBytesInUse(null, resolve);
      });

      const quota = chrome.storage.sync.QUOTA_BYTES;
      const quotaPerItem = chrome.storage.sync.QUOTA_BYTES_PER_ITEM;

      return {
        bytesInUse,
        quota,
        quotaPerItem,
        percentUsed: (bytesInUse / quota) * 100,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }

  async getTemplates() {
    let templates = await this.get(STORAGE_KEYS.TEMPLATES);

    if (!templates) {
      templates = await this.getChunked(STORAGE_KEYS.TEMPLATES);
    }

    return templates || [];
  }

  async setTemplates(templates) {
    return await this.set(STORAGE_KEYS.TEMPLATES, templates);
  }

  async getHistory() {
    let history = await this.get(STORAGE_KEYS.HISTORY);

    if (!history) {
      history = await this.getChunked(STORAGE_KEYS.HISTORY);
    }

    return history || [];
  }

  async setHistory(history) {
    return await this.set(STORAGE_KEYS.HISTORY, history);
  }

  async getSettings() {
    const settings = await this.get(STORAGE_KEYS.SETTINGS);
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };

    // Migrate old apiKey field to new apiKeys structure
    if (settings && settings.apiKey && settings.provider && !settings.apiKeys) {
      // Old format: single apiKey field
      // Migrate to new format: apiKeys object
      mergedSettings.apiKeys = { ...DEFAULT_SETTINGS.apiKeys };
      mergedSettings.apiKeys[settings.provider] = settings.apiKey;

      // Save migrated settings
      await this.setSettings(mergedSettings);
      console.log(`Migrated API key for provider: ${settings.provider}`);
    }

    // Ensure apiKeys object exists
    if (!mergedSettings.apiKeys) {
      mergedSettings.apiKeys = { ...DEFAULT_SETTINGS.apiKeys };
    }

    return mergedSettings;
  }

  async setSettings(settings) {
    return await this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  async getTemplatesSeeded() {
    return (await this.get(STORAGE_KEYS.TEMPLATES_SEEDED)) || false;
  }

  async setTemplatesSeeded(seeded) {
    return await this.set(STORAGE_KEYS.TEMPLATES_SEEDED, seeded);
  }

  async validatePersistence() {
    console.log('Storage: Validating data persistence...');

    try {
      const templates = await this.getTemplates();
      const history = await this.getHistory();
      const settings = await this.getSettings();

      // Keys live under settings.apiKeys[provider]; apiKey is the legacy field.
      const hasApiKey = !!(
        settings?.apiKeys?.[settings?.provider] || settings?.apiKey
      );

      console.log(`Storage validation results:
        - Templates: ${templates?.length || 0} items
        - History: ${history?.length || 0} items
        - Settings: Provider=${settings?.provider}, API Key=${hasApiKey ? 'Present' : 'Not set'}`);

      const storageInfo = await this.getStorageInfo();
      if (storageInfo) {
        console.log(
          `Storage usage: ${Math.round(storageInfo.bytesInUse / 1024)}KB / ${Math.round(storageInfo.quota / 1024)}KB (${Math.round(storageInfo.percentUsed)}%)`
        );
      }

      return {
        templates: templates?.length || 0,
        history: history?.length || 0,
        hasSettings: !!settings?.provider,
        hasApiKey,
        storageInfo,
      };
    } catch (error) {
      console.error('Storage validation failed:', error);
      return null;
    }
  }

  async exportAllData() {
    console.log('Storage: Exporting all data for backup...');

    try {
      const [templates, history, settings] = await Promise.all([
        this.getTemplates(),
        this.getHistory(),
        this.getSettings(),
      ]);

      return {
        templates: templates || [],
        history: history || [],
        settings: settings || {},
        exportedAt: new Date().toISOString(),
        version: '0.9.0',
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  onChanged(callback) {
    const listener = (changes, area) => {
      if (area === 'sync') {
        for (const key in changes) {
          this.cache.delete(key);
          // Chunked writes report `foo_chunk_0`/`foo_chunks`, never `foo`,
          // so map them back to the logical key the cache is keyed by.
          const chunkMatch = key.match(/^(.+?)_(?:chunks|chunk_\d+)$/);
          if (chunkMatch) {
            this.cache.delete(chunkMatch[1]);
          }
        }
        callback(changes, area);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }
}

const storage = new ChromeStorage();
export default storage;
