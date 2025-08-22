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
      
      if (value) {
        this.cache.set(key, value);
        console.debug(`Storage: Retrieved ${key} from storage, cached for future use`);
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
      console.debug(`Storage: Setting ${key}, size: ${serialized.length} bytes`);
      
      if (serialized.length > LIMITS.STORAGE_CHUNK_SIZE) {
        console.debug(`Storage: Using chunked storage for ${key}`);
        await this.setChunked(key, value);
      } else {
        await this.storage.set(data);
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
      const chunkCountResult = await this.storage.get(`${key}_chunks`);
      const chunkCount = chunkCountResult[`${key}_chunks`];
      
      const keysToRemove = [key];
      
      if (chunkCount) {
        keysToRemove.push(`${key}_chunks`);
        for (let i = 0; i < chunkCount; i++) {
          keysToRemove.push(`${key}_chunk_${i}`);
        }
      }
      
      await this.storage.remove(keysToRemove);
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
        percentUsed: (bytesInUse / quota) * 100
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
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  async setSettings(settings) {
    return await this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  async validatePersistence() {
    console.log('Storage: Validating data persistence...');
    
    try {
      const templates = await this.getTemplates();
      const history = await this.getHistory();
      const settings = await this.getSettings();
      
      console.log(`Storage validation results:
        - Templates: ${templates?.length || 0} items
        - History: ${history?.length || 0} items  
        - Settings: Provider=${settings?.provider}, API Key=${settings?.apiKey ? 'Present' : 'Not set'}`);
      
      const storageInfo = await this.getStorageInfo();
      if (storageInfo) {
        console.log(`Storage usage: ${Math.round(storageInfo.bytesInUse / 1024)}KB / ${Math.round(storageInfo.quota / 1024)}KB (${Math.round(storageInfo.percentUsed)}%)`);
      }
      
      return {
        templates: templates?.length || 0,
        history: history?.length || 0,
        hasSettings: !!settings?.provider,
        hasApiKey: !!settings?.apiKey,
        storageInfo
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
        this.getSettings()
      ]);
      
      return {
        templates: templates || [],
        history: history || [],
        settings: settings || {},
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
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

export default new ChromeStorage();