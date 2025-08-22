import storage from './storage.js';
import { generateId, formatDate, formatRelativeTime } from './helpers.js';
import { LIMITS, EVENTS, HISTORY_STATUS } from './constants.js';

class HistoryManager {
  constructor() {
    this.history = [];
    this.listeners = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {return;}
    
    try {
      this.history = await storage.getHistory();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize HistoryManager:', error);
    }
  }

  async getAllHistory() {
    if (!this.initialized) {await this.init();}
    return [...this.history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async getHistoryByTemplate(templateId) {
    if (!this.initialized) {await this.init();}
    return this.history
      .filter(entry => entry.templateId === templateId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async getHistoryEntry(id) {
    if (!this.initialized) {await this.init();}
    return this.history.find(entry => entry.id === id);
  }

  async addHistoryEntry(templateId, templateName, inputs, result, status = HISTORY_STATUS.COMPLETED) {
    if (!this.initialized) {await this.init();}
    
    const entry = {
      id: generateId(),
      templateId,
      templateName,
      inputs: { ...inputs },
      result: result || '',
      status,
      timestamp: new Date().toISOString(),
      duration: 0
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
    if (!this.initialized) {await this.init();}
    
    const index = this.history.findIndex(entry => entry.id === id);
    if (index === -1) {
      throw new Error('History entry not found');
    }
    
    this.history[index] = {
      ...this.history[index],
      ...updates,
      id
    };
    
    await storage.setHistory(this.history);
    this.emit(EVENTS.HISTORY_UPDATED, { type: 'updated', entry: this.history[index] });
    
    return this.history[index];
  }

  async deleteHistoryEntry(id) {
    if (!this.initialized) {await this.init();}
    
    const index = this.history.findIndex(entry => entry.id === id);
    if (index === -1) {
      throw new Error('History entry not found');
    }
    
    const deletedEntry = this.history.splice(index, 1)[0];
    await storage.setHistory(this.history);
    
    this.emit(EVENTS.HISTORY_UPDATED, { type: 'deleted', entry: deletedEntry });
    return deletedEntry;
  }

  async clearHistory() {
    if (!this.initialized) {await this.init();}
    
    const clearedCount = this.history.length;
    this.history = [];
    await storage.setHistory(this.history);
    
    this.emit(EVENTS.HISTORY_UPDATED, { type: 'cleared', count: clearedCount });
    return clearedCount;
  }

  async clearHistoryByTemplate(templateId) {
    if (!this.initialized) {await this.init();}
    
    const originalLength = this.history.length;
    this.history = this.history.filter(entry => entry.templateId !== templateId);
    const clearedCount = originalLength - this.history.length;
    
    if (clearedCount > 0) {
      await storage.setHistory(this.history);
      this.emit(EVENTS.HISTORY_UPDATED, { type: 'template_cleared', templateId, count: clearedCount });
    }
    
    return clearedCount;
  }

  async getHistoryStats() {
    if (!this.initialized) {await this.init();}
    
    const stats = {
      totalEntries: this.history.length,
      completedEntries: 0,
      failedEntries: 0,
      processingEntries: 0,
      templatesUsed: new Set(),
      averageDuration: 0,
      totalDuration: 0,
      recentActivity: []
    };
    
    let totalDuration = 0;
    let durationsCount = 0;
    
    this.history.forEach(entry => {
      switch (entry.status) {
        case HISTORY_STATUS.COMPLETED:
          stats.completedEntries++;
          break;
        case HISTORY_STATUS.FAILED:
          stats.failedEntries++;
          break;
        case HISTORY_STATUS.PROCESSING:
          stats.processingEntries++;
          break;
      }
      
      stats.templatesUsed.add(entry.templateId);
      
      if (entry.duration && entry.duration > 0) {
        totalDuration += entry.duration;
        durationsCount++;
      }
    });
    
    stats.templatesUsed = stats.templatesUsed.size;
    stats.totalDuration = totalDuration;
    stats.averageDuration = durationsCount > 0 ? totalDuration / durationsCount : 0;
    
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    stats.recentActivity = {
      last24Hours: this.history.filter(entry => new Date(entry.timestamp) > last24Hours).length,
      lastWeek: this.history.filter(entry => new Date(entry.timestamp) > lastWeek).length
    };
    
    return stats;
  }

  async searchHistory(query) {
    if (!this.initialized) {await this.init();}
    
    if (!query || query.trim().length === 0) {
      return this.getAllHistory();
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    return this.history
      .filter(entry => 
        entry.templateName.toLowerCase().includes(searchTerm) ||
        entry.result.toLowerCase().includes(searchTerm) ||
        Object.values(entry.inputs).some(input => 
          String(input).toLowerCase().includes(searchTerm)
        )
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async exportHistory() {
    if (!this.initialized) {await this.init();}
    
    return {
      history: this.history,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  async getHistoryForTemplate(templateId, limit = 10) {
    if (!this.initialized) {await this.init();}
    
    return this.history
      .filter(entry => entry.templateId === templateId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(entry => ({
        id: entry.id,
        inputs: entry.inputs,
        result: entry.result,
        status: entry.status,
        timestamp: entry.timestamp,
        formattedTime: formatRelativeTime(entry.timestamp),
        duration: entry.duration
      }));
  }

  async getFavoriteTemplates(limit = 5) {
    if (!this.initialized) {await this.init();}
    
    const templateUsage = {};
    
    this.history.forEach(entry => {
      if (entry.status === HISTORY_STATUS.COMPLETED) {
        const key = entry.templateId;
        if (!templateUsage[key]) {
          templateUsage[key] = {
            templateId: entry.templateId,
            templateName: entry.templateName,
            count: 0,
            lastUsed: entry.timestamp
          };
        }
        templateUsage[key].count++;
        if (new Date(entry.timestamp) > new Date(templateUsage[key].lastUsed)) {
          templateUsage[key].lastUsed = entry.timestamp;
        }
      }
    });
    
    return Object.values(templateUsage)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) {return;}
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) {return;}
    
    const callbacks = this.listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

export default new HistoryManager();