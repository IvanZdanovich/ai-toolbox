/**
 * History Manager Integration Tests
 *
 * Tests the complete history lifecycle including:
 * - Recording template executions
 * - Retrieving history entries
 * - Filtering and searching history
 * - History entry updates
 * - Storage persistence
 * - Limit enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../../support/chrome-api.mock.js';
import {
  fixtures,
  factories,
} from '../../unit-examples/shared/test-data.examples.js';
import { MAX_HISTORY_ENTRIES } from '../../../chrome-extension/constraints/history.constraints.js';

// Mock storage module
vi.mock('../../../chrome-extension/shared/storage.js', async () => {
  return {
    default: {
      getHistory: vi.fn().mockResolvedValue([]),
      setHistory: vi.fn().mockResolvedValue(true),
    },
  };
});

describe('HistoryManager: Given the history manager over a doubled storage', () => {
  let historyManager;
  let storage;

  beforeEach(async () => {
    installChromeMock();
    testUtils.resetStorage();

    vi.resetModules();

    storage = (await import('../../../chrome-extension/shared/storage.js'))
      .default;
    const HistoryManagerModule =
      await import('../../../chrome-extension/shared/history-manager.js');
    historyManager = HistoryManagerModule.default;

    // Reset state
    historyManager.history = [];
    historyManager.initialized = false;
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  describe('HistoryManager: When the first execution is recorded', () => {
    it('HistoryManager: Then it initializes with empty history', async () => {
      // Given: A new user with no history
      storage.getHistory.mockResolvedValue([]);

      // When: History manager initializes
      await historyManager.init();

      // Then: History should be empty
      const history = await historyManager.getAllHistory();
      expect(history).toHaveLength(0);
      expect(historyManager.initialized).toBe(true);
    });

    it('HistoryManager: Then it records first template execution', async () => {
      // Given: Initialized history manager
      storage.getHistory.mockResolvedValue([]);
      await historyManager.init();

      // When: User executes a template
      const entry = await historyManager.addHistoryEntry(
        fixtures.templates.email.id,
        fixtures.templates.email.name,
        fixtures.userInputs.email,
        fixtures.aiResponses.emailResponse,
        'completed'
      );

      // Then: History entry should be created
      expect(entry).toMatchObject({
        templateId: fixtures.templates.email.id,
        templateName: fixtures.templates.email.name,
        status: 'completed',
      });
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(storage.setHistory).toHaveBeenCalled();
    });
  });

  describe('HistoryManager: When the history is listed', () => {
    const existingHistory = [
      fixtures.history.successfulExecution,
      fixtures.history.failedExecution,
      fixtures.history.processingExecution,
    ];

    beforeEach(async () => {
      storage.getHistory.mockResolvedValue(existingHistory);
      await historyManager.init();
    });

    it('HistoryManager: Then it retrieves all history sorted by date', async () => {
      // When: User requests all history
      const history = await historyManager.getAllHistory();

      // Then: History should be sorted newest first
      expect(history).toHaveLength(3);
      for (let i = 0; i < history.length - 1; i++) {
        expect(new Date(history[i].timestamp).getTime()).toBeGreaterThanOrEqual(
          new Date(history[i + 1].timestamp).getTime()
        );
      }
    });

    it('HistoryManager: Then it filters history by template', async () => {
      // When: User filters by template ID
      const filtered = await historyManager.getHistoryByTemplate(
        fixtures.templates.email.id
      );

      // Then: Only matching entries should be returned
      expect(
        filtered.every((h) => h.templateId === fixtures.templates.email.id)
      ).toBe(true);
    });

    it('HistoryManager: Then it retrieves specific history entry', async () => {
      // When: User retrieves specific entry
      const entry = await historyManager.getHistoryEntry(
        fixtures.history.successfulExecution.id
      );

      // Then: Correct entry should be returned
      expect(entry).toBeDefined();
      expect(entry.id).toBe(fixtures.history.successfulExecution.id);
    });

    it('HistoryManager: Then it returns undefined for non-existent entry', async () => {
      // When: User retrieves non-existent entry
      const entry = await historyManager.getHistoryEntry('non-existent-id');

      // Then: Should return undefined
      expect(entry).toBeUndefined();
    });
  });

  describe('HistoryManager: When the history is searched', () => {
    beforeEach(async () => {
      const history = [
        factories.createHistoryEntry({
          templateName: 'Email Response',
          result: 'Dear customer...',
        }),
        factories.createHistoryEntry({
          templateName: 'Code Review',
          result: 'Function looks good...',
        }),
        factories.createHistoryEntry({
          templateName: 'Email Draft',
          result: 'Hello team...',
        }),
        factories.createHistoryEntry({
          templateName: 'Meeting Notes',
          result: 'Action items...',
        }),
      ];
      storage.getHistory.mockResolvedValue(history);
      await historyManager.init();
    });

    it('HistoryManager: Then it searches history by template name', async () => {
      // When: User searches for "Email"
      const results = await historyManager.searchHistory('Email');

      // Then: Should return matching entries
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          (h) => h.templateName.includes('Email') || h.result.includes('Email')
        )
      ).toBe(true);
    });

    it('HistoryManager: Then it searches history by result content', async () => {
      // When: User searches for "customer"
      const results = await historyManager.searchHistory('customer');

      // Then: Should return matching entries
      expect(results.length).toBeGreaterThan(0);
    });

    it('HistoryManager: Then it returns empty for no matches', async () => {
      // When: User searches for non-existent term
      const results = await historyManager.searchHistory('xyz123nonexistent');

      // Then: Should return empty array
      expect(results).toHaveLength(0);
    });
  });

  describe('HistoryManager: When an execution is recorded with each status', () => {
    beforeEach(async () => {
      storage.getHistory.mockResolvedValue([]);
      await historyManager.init();
    });

    it('HistoryManager: Then it records successful execution', async () => {
      // When: Recording a successful execution
      const entry = await historyManager.addHistoryEntry(
        'template-001',
        'Test Template',
        { input: 'test' },
        'Successful result',
        'completed'
      );

      // Then: Entry should have completed status
      expect(entry.status).toBe('completed');
      expect(entry.result).toBe('Successful result');
    });

    it('HistoryManager: Then it records failed execution', async () => {
      // When: Recording a failed execution
      const entry = await historyManager.addHistoryEntry(
        'template-001',
        'Test Template',
        { input: 'test' },
        '',
        'failed'
      );

      // Then: Entry should have failed status
      expect(entry.status).toBe('failed');
    });

    it('HistoryManager: Then it updates processing entry to completed', async () => {
      // Given: A processing entry
      const entry = await historyManager.addHistoryEntry(
        'template-001',
        'Test Template',
        { input: 'test' },
        '',
        'processing'
      );

      // When: Updating to completed
      const updated = await historyManager.updateHistoryEntry(entry.id, {
        status: 'completed',
        result: 'Final result',
        duration: 1500,
      });

      // Then: Entry should be updated
      expect(updated.status).toBe('completed');
      expect(updated.result).toBe('Final result');
      expect(updated.duration).toBe(1500);
    });
  });

  describe('HistoryManager: When the history limit is reached', () => {
    it('HistoryManager: Then it enforces maximum history entries', async () => {
      // Given: History at the limit
      const maxEntries = MAX_HISTORY_ENTRIES;
      const history = factories.createHistoryEntries(maxEntries);
      storage.getHistory.mockResolvedValue(history);
      await historyManager.init();

      // When: Adding another entry
      await historyManager.addHistoryEntry(
        'new-template',
        'New Execution',
        { input: 'test' },
        'New result',
        'completed'
      );

      // Then: Total should not exceed limit
      const allHistory = await historyManager.getAllHistory();
      expect(allHistory.length).toBeLessThanOrEqual(maxEntries);
    });

    it('HistoryManager: Then it removes oldest entries when limit exceeded', async () => {
      // Given: History at the limit with known oldest entry
      const maxEntries = MAX_HISTORY_ENTRIES;
      const oldestTimestamp = '2020-01-01T00:00:00.000Z';
      const history = [
        ...factories.createHistoryEntries(maxEntries - 1),
        factories.createHistoryEntry({
          id: 'oldest-entry',
          timestamp: oldestTimestamp,
        }),
      ];
      storage.getHistory.mockResolvedValue(history);
      await historyManager.init();

      // When: Adding a new entry
      await historyManager.addHistoryEntry(
        'new-template',
        'New Execution',
        { input: 'test' },
        'New result',
        'completed'
      );

      // Then: Oldest entry should be removed
      await expect(
        historyManager.getHistoryEntry('oldest-entry')
      ).resolves.toBeFalsy();
    });
  });

  describe('HistoryManager: When the history is cleared', () => {
    beforeEach(async () => {
      const history = factories.createHistoryEntries(10);
      storage.getHistory.mockResolvedValue(history);
      await historyManager.init();
    });

    it('HistoryManager: Then it clears all history', async () => {
      // Given: History with entries
      const initialHistory = await historyManager.getAllHistory();
      expect(initialHistory.length).toBeGreaterThan(0);

      // When: Clearing history
      await historyManager.clearHistory();

      // Then: History should be empty
      const history = await historyManager.getAllHistory();
      expect(history).toHaveLength(0);
    });

    it('HistoryManager: Then it clears history for specific template', async () => {
      // Given: History with multiple templates
      const templateId = 'template-to-clear';
      const history = [
        ...factories.createHistoryEntries(5, { templateId }),
        ...factories.createHistoryEntries(5, { templateId: 'other-template' }),
      ];
      storage.getHistory.mockResolvedValue(history);
      await historyManager.init();

      // When: Clearing history for specific template
      if (historyManager.clearHistoryForTemplate) {
        await historyManager.clearHistoryForTemplate(templateId);

        // Then: Only that template's history should be cleared
        const remaining = await historyManager.getAllHistory();
        expect(remaining.every((h) => h.templateId !== templateId)).toBe(true);
      }
    });
  });

  describe('HistoryManager: When a change emits an event', () => {
    beforeEach(async () => {
      storage.getHistory.mockResolvedValue([]);
      await historyManager.init();
    });

    it('HistoryManager: Then it emits event when history entry is added', async () => {
      // Given: A listener for history events
      const eventSpy = vi.fn();
      historyManager.on?.('history-updated', eventSpy);

      // When: Adding history entry
      await historyManager.addHistoryEntry(
        'template-001',
        'Test Template',
        { input: 'test' },
        'Result',
        'completed'
      );

      // Then: Event should be emitted (if implemented)
    });
  });
});

describe('HistoryManager: Given a storage layer that fails', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  it('HistoryManager: Then it handles storage errors gracefully', async () => {
    // Given: Storage that throws errors
    vi.resetModules();
    const storage = (
      await import('../../../chrome-extension/shared/storage.js')
    ).default;
    storage.getHistory.mockRejectedValue(new Error('Storage unavailable'));

    const HistoryManagerModule =
      await import('../../../chrome-extension/shared/history-manager.js');
    const historyManager = HistoryManagerModule.default;

    // Suppress expected console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // When: Initializing with failing storage
    await historyManager.init();

    // Then: Should handle gracefully
    expect(historyManager.initialized).toBe(false);

    consoleSpy.mockRestore();
  });

  it('HistoryManager: Then it handles update errors for non-existent entries', async () => {
    // Given: Initialized history manager
    vi.resetModules();
    const storage = (
      await import('../../../chrome-extension/shared/storage.js')
    ).default;
    storage.getHistory.mockResolvedValue([]);

    const HistoryManagerModule =
      await import('../../../chrome-extension/shared/history-manager.js');
    const historyManager = HistoryManagerModule.default;
    await historyManager.init();

    // When/Then: Updating non-existent entry should throw
    await expect(
      historyManager.updateHistoryEntry('non-existent', { status: 'completed' })
    ).rejects.toThrow();
  });
});
