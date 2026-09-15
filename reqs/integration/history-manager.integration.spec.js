/**
 * History manager — integration.
 *
 * Primary module: chrome-extension/shared/history-manager.js, whose contract
 * is with storage.js: every mutation has to reach chrome.storage.sync in a
 * shape the next session can read back, and the entry cap has to be applied
 * before the write rather than on display. Only the platform edge is doubled.
 *
 * Origin: layout.adr-4.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../support/chrome-api.mock.js';
import { STORAGE_KEYS } from '../../chrome-extension/constraints/storage.constraints.js';
import { MAX_HISTORY_ENTRIES } from '../../chrome-extension/constraints/history.constraints.js';
import { HISTORY_STATUS } from '../../chrome-extension/shared/constants.js';

const HISTORY_MANAGER = '../../chrome-extension/shared/history-manager.js';

async function freshManager() {
  vi.resetModules();
  return (await import(HISTORY_MANAGER)).default;
}

function storedHistory() {
  return testUtils.getStorageState()[STORAGE_KEYS.HISTORY] || [];
}

describe('HistoryManager: Given the history manager against the real storage module', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.restoreAllMocks();
  });

  it('HistoryManager: Then it hands a recorded run to the next session through storage', async () => {
    const manager = await freshManager();
    await manager.init();

    await manager.addHistoryEntry(
      't1',
      'Greeter',
      { name: 'Ada' },
      'Hello Ada',
      HISTORY_STATUS.COMPLETED,
      42
    );

    const reopened = await freshManager();
    const [entry] = await reopened.getAllHistory();
    expect(entry.templateName).toBe('Greeter');
    expect(entry.result).toBe('Hello Ada');
    expect(entry.duration).toBe(42);
  });

  it('HistoryManager: Then it drops the oldest entries rather than storing more than the cap', async () => {
    const manager = await freshManager();
    await manager.init();
    for (let index = 0; index < MAX_HISTORY_ENTRIES + 5; index++) {
      await manager.addHistoryEntry(
        't1',
        `Run ${index}`,
        {},
        `result ${index}`,
        HISTORY_STATUS.COMPLETED
      );
    }

    const reopened = await freshManager();
    const persisted = await reopened.getAllHistory();
    expect(persisted).toHaveLength(MAX_HISTORY_ENTRIES);
    const names = persisted.map((entry) => entry.templateName);
    expect(names).toContain(`Run ${MAX_HISTORY_ENTRIES + 4}`);
    expect(names).not.toContain('Run 0');
  });

  it('HistoryManager: Then it returns the newest run first after a reload', async () => {
    testUtils.setStorageState({
      [STORAGE_KEYS.HISTORY]: [
        {
          id: 'h1',
          templateName: 'Older',
          inputs: {},
          result: '',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'h2',
          templateName: 'Newer',
          inputs: {},
          result: '',
          timestamp: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    const manager = await freshManager();

    const all = await manager.getAllHistory();

    expect(all[0].templateName).toBe('Newer');
  });

  it('HistoryManager: Then it persists an update to a recorded run', async () => {
    const manager = await freshManager();
    await manager.init();
    const entry = await manager.addHistoryEntry(
      't1',
      'Greeter',
      {},
      '',
      HISTORY_STATUS.FAILED
    );

    await manager.updateHistoryEntry(entry.id, {
      status: HISTORY_STATUS.COMPLETED,
      result: 'Hello Ada',
    });

    const reopened = await freshManager();
    const stored = await reopened.getHistoryEntry(entry.id);
    expect(stored.status).toBe(HISTORY_STATUS.COMPLETED);
    expect(stored.result).toBe('Hello Ada');
  });

  it('HistoryManager: Then it refuses to update an entry that is no longer stored', async () => {
    const manager = await freshManager();
    await manager.init();

    await expect(
      manager.updateHistoryEntry('nope', { result: 'x' })
    ).rejects.toThrow(/not found/i);
  });

  it('HistoryManager: Then it removes a deleted run from storage, not just from memory', async () => {
    const manager = await freshManager();
    await manager.init();
    const entry = await manager.addHistoryEntry('t1', 'Greeter', {}, 'out');

    await manager.deleteHistoryEntry(entry.id);

    expect(storedHistory()).toHaveLength(0);
    const reopened = await freshManager();
    expect(await reopened.getAllHistory()).toHaveLength(0);
  });

  it('HistoryManager: Then it clears every run and says how many it removed', async () => {
    const manager = await freshManager();
    await manager.init();
    await manager.addHistoryEntry('t1', 'One', {}, 'a');
    await manager.addHistoryEntry('t2', 'Two', {}, 'b');

    const cleared = await manager.clearHistory();

    expect(cleared).toBe(2);
    const reopened = await freshManager();
    expect(await reopened.getAllHistory()).toHaveLength(0);
  });

  it('HistoryManager: Then it carries a history too large for one sync item through chunked storage', async () => {
    const manager = await freshManager();
    await manager.init();
    const longResult = 'z'.repeat(2000);
    for (let index = 0; index < 6; index++) {
      await manager.addHistoryEntry('t1', `Run ${index}`, {}, longResult);
    }

    // Chunked, not plain: the plain key is removed when a value is split.
    expect(storedHistory()).toHaveLength(0);
    const reopened = await freshManager();
    const all = await reopened.getAllHistory();
    expect(all).toHaveLength(6);
    expect(all[0].result).toBe(longResult);
  });

  it('HistoryManager: Then it keeps every entry when several runs are recorded at once', async () => {
    const manager = await freshManager();

    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        manager.addHistoryEntry('t1', `Run ${index}`, {}, `out ${index}`)
      )
    );

    const reopened = await freshManager();
    expect(await reopened.getAllHistory()).toHaveLength(5);
  });
});
