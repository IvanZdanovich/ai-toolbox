import storage from './storage.js';
import { generateId } from './helpers.js';
import { LIMITS, EVENTS, HISTORY_STATUS } from './constants.js';

class HistoryManager {
  constructor() {
    this.history = [];
    this.listeners = new Map();
    this.initialized = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    // Share one in-flight load so concurrent callers can't each overwrite
    // this.history and drop entries added in between.
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          this.history = await storage.getHistory();
          this.initialized = true;
        } catch (error) {
          console.error('Failed to initialize HistoryManager:', error);
        } finally {
          this.initPromise = null;
        }
      })();
    }

    return this.initPromise;
  }

  // Re-reads history from storage into memory, for when another page
  // (e.g. the editor tab) has changed it.
  async refresh() {
    this.history = await storage.getHistory();
  }

  async getAllHistory() {
    if (!this.initialized) {
      await this.init();
    }
    return [...this.history].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  async getHistoryByTemplate(templateId) {
    if (!this.initialized) {
      await this.init();
    }
    return this.history
      .filter((entry) => entry.templateId === templateId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async getHistoryEntry(id) {
    if (!this.initialized) {
      await this.init();
    }
    return this.history.find((entry) => entry.id === id);
  }

  async addHistoryEntry(
    templateId,
    templateName,
    inputs,
    result,
    status = HISTORY_STATUS.COMPLETED,
    duration = 0
  ) {
    if (!this.initialized) {
      await this.init();
    }

    const entry = {
      id: generateId(),
      templateId,
      templateName,
      inputs: { ...inputs },
      result: result || '',
      status,
      timestamp: new Date().toISOString(),
      duration,
    };

    this.history.unshift(entry);

    if (this.history.length > LIMITS.MAX_HISTORY_ENTRIES) {
      this.history = this.history.slice(0, LIMITS.MAX_HISTORY_ENTRIES);
    }

    await storage.setHistory(this.history);
    this.emit(EVENTS.HISTORY_UPDATED, { type: 'added', entry });

    return entry;
  }

  async updateHistoryEntry(id, updates) {
    if (!this.initialized) {
      await this.init();
    }

    const index = this.history.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new Error('History entry not found');
    }

    this.history[index] = {
      ...this.history[index],
      ...updates,
      id,
    };

    await storage.setHistory(this.history);
    this.emit(EVENTS.HISTORY_UPDATED, {
      type: 'updated',
      entry: this.history[index],
    });

    return this.history[index];
  }

  async deleteHistoryEntry(id) {
    if (!this.initialized) {
      await this.init();
    }

    const index = this.history.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new Error('History entry not found');
    }

    const deletedEntry = this.history.splice(index, 1)[0];
    await storage.setHistory(this.history);

    this.emit(EVENTS.HISTORY_UPDATED, { type: 'deleted', entry: deletedEntry });
    return deletedEntry;
  }

  async clearHistory() {
    if (!this.initialized) {
      await this.init();
    }

    const clearedCount = this.history.length;
    this.history = [];
    await storage.setHistory(this.history);

    this.emit(EVENTS.HISTORY_UPDATED, { type: 'cleared', count: clearedCount });
    return clearedCount;
  }

  async searchHistory(query) {
    if (!this.initialized) {
      await this.init();
    }

    if (!query || query.trim().length === 0) {
      return this.getAllHistory();
    }

    const searchTerm = query.toLowerCase().trim();

    return this.history
      .filter(
        (entry) =>
          String(entry.templateName || '')
            .toLowerCase()
            .includes(searchTerm) ||
          String(entry.result || '')
            .toLowerCase()
            .includes(searchTerm) ||
          Object.values(entry.inputs || {}).some((input) =>
            String(input).toLowerCase().includes(searchTerm)
          )
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }

    const callbacks = this.listeners.get(event);
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

export default new HistoryManager();
