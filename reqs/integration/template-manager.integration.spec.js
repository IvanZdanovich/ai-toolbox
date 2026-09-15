/**
 * Template manager — integration.
 *
 * Primary module: chrome-extension/shared/template-manager.js, whose contract
 * is with storage.js — what it hands over to be persisted, what it expects to
 * read back, and what it does when a write is refused. helpers.js (validation
 * and variable extraction) stays real too; only chrome.storage, the platform
 * edge, is doubled.
 *
 * Origin: layout.adr-4.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  chromeMock,
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../support/chrome-api.mock.js';
import { STORAGE_KEYS } from '../../chrome-extension/constraints/storage.constraints.js';
import {
  MAX_TEMPLATES,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_PROMPT_LENGTH,
} from '../../chrome-extension/constraints/template.constraints.js';

const TEMPLATE_MANAGER = '../../chrome-extension/shared/template-manager.js';

async function freshManager() {
  vi.resetModules();
  return (await import(TEMPLATE_MANAGER)).default;
}

function storedTemplates() {
  return testUtils.getStorageState()[STORAGE_KEYS.TEMPLATES] || [];
}

describe('TemplateManager: Given the template manager against the real storage module', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.restoreAllMocks();
  });

  describe('TemplateManager: When the library is seeded on first run', () => {
    it('TemplateManager: Then it writes the starter templates to storage on a first run', async () => {
      const manager = await freshManager();

      await manager.init();

      // The seeded library is larger than one sync item, so it lands as
      // chunks; a fresh manager reading it back is what proves it persisted.
      const reopened = await freshManager();
      expect((await reopened.getAllTemplates()).length).toBeGreaterThan(0);
      expect(testUtils.getStorageState()[STORAGE_KEYS.TEMPLATES_SEEDED]).toBe(
        true
      );
    });

    it('TemplateManager: Then it leaves an emptied library empty on the next run', async () => {
      const manager = await freshManager();
      await manager.init();
      for (const template of await manager.getAllTemplates()) {
        await manager.deleteTemplate(template.id);
      }

      const reopened = await freshManager();
      await reopened.init();

      expect(await reopened.getAllTemplates()).toHaveLength(0);
    });
  });

  describe('TemplateManager: When a template is persisted and read back', () => {
    it('TemplateManager: Then it hands a created template to the next session through storage', async () => {
      const manager = await freshManager();
      await manager.init();

      const created = await manager.createTemplate({
        name: 'Summarize',
        prompt: 'Summarize {text} in {length} words',
      });

      const reopened = await freshManager();
      const found = await reopened.getTemplate(created.id);
      expect(found.name).toBe('Summarize');
      expect(found.inputs.map((input) => input.name)).toEqual([
        'text',
        'length',
      ]);
    });

    it('TemplateManager: Then it rebuilds the persisted inputs when the prompt changes', async () => {
      const manager = await freshManager();
      await manager.init();
      const created = await manager.createTemplate({
        name: 'Summarize',
        prompt: 'Summarize {text}',
      });

      await manager.updateTemplate(created.id, {
        prompt: 'Translate {text} into {language}',
      });

      const reopened = await freshManager();
      const found = await reopened.getTemplate(created.id);
      expect(found.inputs.map((input) => input.name)).toEqual([
        'text',
        'language',
      ]);
    });

    it('TemplateManager: Then it carries a library too large for one sync item through chunked storage', async () => {
      const manager = await freshManager();
      testUtils.setStorageState({ [STORAGE_KEYS.TEMPLATES_SEEDED]: true });
      await manager.init();
      const longPrompt = `{text} ${'y'.repeat(MAX_TEMPLATE_PROMPT_LENGTH - 20)}`;
      for (let index = 0; index < 5; index++) {
        await manager.createTemplate({
          name: `Long ${index}`,
          prompt: longPrompt,
        });
      }

      // Chunked, not plain: the plain key is removed when a value is split.
      expect(storedTemplates()).toHaveLength(0);
      const reopened = await freshManager();
      const all = await reopened.getAllTemplates();
      expect(all).toHaveLength(5);
      expect(all[4].prompt).toBe(longPrompt);
    });

    it('TemplateManager: Then it keeps the in-memory library in step with a failed storage write', async () => {
      const manager = await freshManager();
      await manager.init();
      const before = (await manager.getAllTemplates()).length;
      vi.spyOn(chromeMock.storage.sync, 'set').mockRejectedValue(
        new Error('QUOTA_BYTES quota exceeded')
      );

      await expect(
        manager.createTemplate({ name: 'Doomed', prompt: 'x {y}' })
      ).rejects.toThrow(/storage quota/i);

      expect(await manager.getAllTemplates()).toHaveLength(before);
    });

    it('TemplateManager: Then it restores the deleted template when the write that removes it fails', async () => {
      const manager = await freshManager();
      await manager.init();
      const victim = (await manager.getAllTemplates())[0];
      vi.spyOn(chromeMock.storage.sync, 'set').mockRejectedValue(
        new Error('write failed')
      );

      await expect(manager.deleteTemplate(victim.id)).rejects.toThrow(
        /storage write failed/i
      );

      expect(await manager.getTemplate(victim.id)).toBeDefined();
    });
  });

  describe('TemplateManager: When the library limit is reached', () => {
    it('TemplateManager: Then it stops creating once the stored templates reach the cap', async () => {
      const manager = await freshManager();
      testUtils.setStorageState({
        [STORAGE_KEYS.TEMPLATES]: Array.from(
          { length: MAX_TEMPLATES },
          (_, i) => ({
            id: `t${i}`,
            name: `Template ${i}`,
            description: '',
            prompt: 'Do {thing}',
            inputs: [],
          })
        ),
        [STORAGE_KEYS.TEMPLATES_SEEDED]: true,
      });
      await manager.init();

      await expect(
        manager.createTemplate({ name: 'One too many', prompt: 'x {y}' })
      ).rejects.toThrow(String(MAX_TEMPLATES));
    });

    it('TemplateManager: Then it keeps a duplicate of a maximum-length name within the name limit', async () => {
      const manager = await freshManager();
      testUtils.setStorageState({ [STORAGE_KEYS.TEMPLATES_SEEDED]: true });
      await manager.init();
      const original = await manager.createTemplate({
        name: 'n'.repeat(MAX_TEMPLATE_NAME_LENGTH),
        prompt: 'Do {thing}',
      });

      const copy = await manager.duplicateTemplate(original.id);

      expect(copy.name.length).toBeLessThanOrEqual(MAX_TEMPLATE_NAME_LENGTH);
      expect(copy.name).toContain('(Copy)');
      const reopened = await freshManager();
      expect(await reopened.getTemplate(copy.id)).toBeDefined();
    });
  });

  describe('TemplateManager: When templates are imported or exported', () => {
    it('TemplateManager: Then it renames an imported template that collides with one already stored', async () => {
      const manager = await freshManager();
      testUtils.setStorageState({ [STORAGE_KEYS.TEMPLATES_SEEDED]: true });
      await manager.init();
      await manager.createTemplate({ name: 'Greeter', prompt: 'Hi {name}' });

      const result = await manager.importTemplates({
        templates: [{ name: 'Greeter', prompt: 'Hello {name}' }],
      });

      expect(result.imported[0].name).toContain('(Imported)');
      const reopened = await freshManager();
      expect(await reopened.getAllTemplates()).toHaveLength(2);
    });

    it('TemplateManager: Then it reports the templates it could not import and keeps the rest', async () => {
      const manager = await freshManager();
      testUtils.setStorageState({ [STORAGE_KEYS.TEMPLATES_SEEDED]: true });
      await manager.init();

      const result = await manager.importTemplates({
        templates: [
          { name: 'Fine', prompt: 'Do {thing}' },
          { name: 'Broken', prompt: '' },
        ],
      });

      expect(result.imported).toHaveLength(1);
      expect(result.errors[0]).toContain('Broken');
    });

    it('TemplateManager: Then it exports what storage holds, stamped with the extension version', async () => {
      const manager = await freshManager();
      await manager.init();
      const persisted = await (await freshManager()).getAllTemplates();

      const exported = await manager.exportTemplates();

      expect(exported.templates).toHaveLength(persisted.length);
      expect(exported.version).toBe(chromeMock.runtime.getManifest().version);
    });
  });
});
