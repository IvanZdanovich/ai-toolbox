/**
 * End-to-End Workflow Integration Tests
 *
 * Tests complete user workflows across all components:
 * - Full template lifecycle (create → execute → view history)
 * - Settings configuration workflow
 * - Error recovery scenarios
 * - Data persistence across sessions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../mocks/chrome-api.mock.js';
import { fixtures, factories } from '../fixtures/test-data.js';

describe('E2E: Complete Template Workflow', () => {
  let storage, templateManager, historyManager, aiService;

  beforeEach(async () => {
    installChromeMock();
    testUtils.resetStorage();
    vi.resetModules();

    // Import all modules fresh
    storage = (await import('../../shared/storage.js')).default;
    templateManager = (await import('../../shared/template-manager.js'))
      .default;
    historyManager = (await import('../../shared/history-manager.js')).default;
    aiService = (await import('../../shared/ai-service.js')).default;
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  describe('Workflow: First-time user creates and executes a template', () => {
    it('should complete full workflow from creation to execution', async () => {
      // Step 1: Initialize all services
      await templateManager.init();
      await historyManager.init();
      await aiService.init();

      // Verify initial state
      const initialTemplates = await templateManager.getAllTemplates();
      expect(initialTemplates.length).toBeGreaterThanOrEqual(0);

      // Step 2: Create a new template
      const newTemplate = {
        name: 'Customer Support Reply',
        description: 'Generate helpful customer support responses',
        prompt:
          'Write a helpful customer support response to: {customer_message}. Be {tone} and provide {solution_type} solutions.',
      };

      const createdTemplate = await templateManager.createTemplate(newTemplate);
      expect(createdTemplate.id).toBeDefined();
      expect(createdTemplate.name).toBe('Customer Support Reply');

      // Step 3: Verify template is persisted
      const templatesAfterCreate = await templateManager.getAllTemplates();
      const foundTemplate = templatesAfterCreate.find(
        (t) => t.id === createdTemplate.id
      );
      expect(foundTemplate).toBeDefined();

      // Step 4: Execute the template
      const inputs = {
        customer_message: 'My order arrived damaged and I want a refund',
        tone: 'empathetic and professional',
        solution_type: 'practical',
      };

      const result = await aiService.processTemplate(createdTemplate, inputs);
      expect(result.result).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // Step 5: Record in history
      const historyEntry = await historyManager.addHistoryEntry(
        createdTemplate.id,
        createdTemplate.name,
        inputs,
        result.result,
        'completed'
      );

      expect(historyEntry.id).toBeDefined();
      expect(historyEntry.status).toBe('completed');

      // Step 6: Verify history is recorded
      const history = await historyManager.getAllHistory();
      const foundEntry = history.find((h) => h.id === historyEntry.id);
      expect(foundEntry).toBeDefined();
      expect(foundEntry.templateName).toBe('Customer Support Reply');
    });
  });

  describe('Workflow: User manages template library', () => {
    it('should handle create, update, and delete operations', async () => {
      await templateManager.init();

      // Create multiple templates
      const template1 = await templateManager.createTemplate({
        name: 'Template A',
        prompt: 'Process {input}',
      });

      const template2 = await templateManager.createTemplate({
        name: 'Template B',
        prompt: 'Analyze {data}',
      });

      // Verify creation
      let templates = await templateManager.getAllTemplates();
      expect(
        templates.filter((t) => ['Template A', 'Template B'].includes(t.name))
      ).toHaveLength(2);

      // Update template
      const updated = await templateManager.updateTemplate(template1.id, {
        name: 'Template A (Updated)',
        description: 'Added description',
      });

      expect(updated.name).toBe('Template A (Updated)');
      expect(updated.description).toBe('Added description');

      // Delete template
      await templateManager.deleteTemplate(template2.id);
      templates = await templateManager.getAllTemplates();
      expect(templates.find((t) => t.id === template2.id)).toBeUndefined();

      // Verify final state
      const finalTemplate = await templateManager.getTemplate(template1.id);
      expect(finalTemplate.name).toBe('Template A (Updated)');
    });
  });

  describe('Workflow: User searches and filters content', () => {
    it('should find templates and history by search', async () => {
      await templateManager.init();
      await historyManager.init();

      // Create diverse templates
      await templateManager.createTemplate({
        name: 'Email Writer',
        description: 'Write professional emails',
        prompt: 'Write an email about {topic}',
      });

      await templateManager.createTemplate({
        name: 'Code Reviewer',
        description: 'Review code for issues',
        prompt: 'Review this code: {code}',
      });

      await templateManager.createTemplate({
        name: 'Email Summarizer',
        description: 'Summarize long emails',
        prompt: 'Summarize: {email}',
      });

      // Search for "email"
      const emailTemplates = await templateManager.searchTemplates('email');
      expect(emailTemplates.length).toBeGreaterThanOrEqual(2);
      expect(
        emailTemplates.every(
          (t) =>
            t.name.toLowerCase().includes('email') ||
            t.description.toLowerCase().includes('email')
        )
      ).toBe(true);

      // Search for "code"
      const codeTemplates = await templateManager.searchTemplates('code');
      expect(codeTemplates.length).toBeGreaterThanOrEqual(1);

      // Add history entries
      await historyManager.addHistoryEntry(
        't1',
        'Email Writer',
        {},
        'Email result',
        'completed'
      );
      await historyManager.addHistoryEntry(
        't2',
        'Code Reviewer',
        {},
        'Code result',
        'completed'
      );

      // Search history
      const emailHistory = await historyManager.searchHistory('email');
      expect(emailHistory.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('E2E: Settings Configuration Workflow', () => {
  let storage, aiService;

  beforeEach(async () => {
    installChromeMock();
    testUtils.resetStorage();
    vi.resetModules();

    storage = (await import('../../shared/storage.js')).default;
    aiService = (await import('../../shared/ai-service.js')).default;
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  describe('Workflow: User configures AI provider', () => {
    it('should switch from mock to OpenAI provider', async () => {
      // Step 1: Start with default mock provider
      await aiService.init();
      expect(aiService.settings.provider).toBe('mock');

      // Step 2: Process template with mock
      const template = fixtures.templates.email;
      const inputs = fixtures.userInputs.email;

      const mockResult = await aiService.processTemplate(template, inputs);
      expect(mockResult.provider).toBe('mock');

      // Step 3: Update settings to use OpenAI
      await storage.setSettings({
        provider: 'openai',
        apiKey: 'sk-test-key-12345',
        defaultProvider: 'openai',
        theme: 'light',
      });

      // Step 4: Re-initialize with new settings
      aiService.settings = null; // Reset
      await aiService.init();

      expect(aiService.settings.provider).toBe('openai');
      expect(aiService.settings.apiKey).toBe('sk-test-key-12345');
    });

    it('should persist settings across sessions', async () => {
      // Session 1: Configure settings
      await storage.setSettings({
        provider: 'claude',
        apiKey: 'sk-ant-test-key',
        theme: 'dark',
      });

      // Simulate session restart by resetting modules
      vi.resetModules();
      const newStorage = (await import('../../shared/storage.js')).default;

      // Session 2: Verify settings persisted
      const settings = await newStorage.getSettings();
      expect(settings.provider).toBe('claude');
      expect(settings.apiKey).toBe('sk-ant-test-key');
      expect(settings.theme).toBe('dark');
    });
  });

  describe('Workflow: User manages storage', () => {
    it('should track storage usage', async () => {
      // Add some data
      await storage.setTemplates(factories.createTemplates(20));
      await storage.setHistory(factories.createHistoryEntries(50));

      // Check storage info
      const info = await storage.getStorageInfo();
      if (info) {
        expect(info.bytesInUse).toBeGreaterThan(0);
        expect(info.percentUsed).toBeGreaterThan(0);
      }
    });

    it('should export and import data', async () => {
      // Create some data
      const templates = factories.createTemplates(5);
      await storage.setTemplates(templates);

      const history = factories.createHistoryEntries(10);
      await storage.setHistory(history);

      // Export (simulate)
      const exportData = {
        templates: await storage.getTemplates(),
        history: await storage.getHistory(),
        settings: await storage.getSettings(),
        exportedAt: new Date().toISOString(),
      };

      expect(exportData.templates).toHaveLength(5);
      expect(exportData.history).toHaveLength(10);

      // Clear and reimport
      await storage.clear();

      // Import
      await storage.setTemplates(exportData.templates);
      await storage.setHistory(exportData.history);
      await storage.setSettings(exportData.settings);

      // Verify
      const importedTemplates = await storage.getTemplates();
      expect(importedTemplates).toHaveLength(5);
    });
  });
});

describe('E2E: Error Recovery Workflow', () => {
  let storage, templateManager, historyManager, aiService;

  beforeEach(async () => {
    installChromeMock();
    testUtils.resetStorage();
    vi.resetModules();

    storage = (await import('../../shared/storage.js')).default;
    templateManager = (await import('../../shared/template-manager.js'))
      .default;
    historyManager = (await import('../../shared/history-manager.js')).default;
    aiService = (await import('../../shared/ai-service.js')).default;
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  describe('Workflow: Handling failed template execution', () => {
    it('should record failed execution and allow retry', async () => {
      await templateManager.init();
      await historyManager.init();
      await aiService.init();

      const template = await templateManager.createTemplate({
        name: 'Test Template',
        prompt: 'Process {input}',
      });

      // Simulate failed execution
      const inputs = { input: 'test data' };

      // Record failure
      const failedEntry = await historyManager.addHistoryEntry(
        template.id,
        template.name,
        inputs,
        '',
        'failed'
      );

      expect(failedEntry.status).toBe('failed');

      // Retry with mock (should succeed). processWithMock throws on
      // Math.random() < 0.1, so pin it to keep this assertion deterministic.
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const retryResult = await aiService.processTemplate(template, inputs);
      expect(retryResult.result).toBeDefined();

      // Update history entry
      const updatedEntry = await historyManager.updateHistoryEntry(
        failedEntry.id,
        {
          status: 'completed',
          result: retryResult.result,
          duration: retryResult.duration,
        }
      );

      expect(updatedEntry.status).toBe('completed');
    });
  });

  describe('Workflow: Recovering from corrupted data', () => {
    it('should handle corrupted templates gracefully', async () => {
      // Inject corrupted data
      testUtils.setStorageState({
        templates: 'corrupted-data-not-array',
      });

      // Initialize should handle gracefully
      vi.resetModules();
      const newTemplateManager = (
        await import('../../shared/template-manager.js')
      ).default;

      // Should not crash
      await newTemplateManager.init();

      // Should be usable
      const templates = await newTemplateManager.getAllTemplates();
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  describe('Workflow: Rate limit recovery', () => {
    it('should handle rate limits and recover', async () => {
      await aiService.init();

      // Fill up rate limit
      const now = Date.now();
      aiService.requestTimestamps = Array.from({ length: 20 }, () => now);

      const template = fixtures.templates.email;
      const inputs = fixtures.userInputs.email;

      // Should be rate limited
      await expect(aiService.processTemplate(template, inputs)).rejects.toThrow(
        'Rate limit'
      );

      // Simulate time passing (clear old timestamps)
      aiService.requestTimestamps = [];

      // Should work now
      const result = await aiService.processTemplate(template, inputs);
      expect(result.result).toBeDefined();
    });
  });
});

describe('E2E: Multi-session Persistence', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  describe('Workflow: Data persists across browser sessions', () => {
    it('should maintain all data across simulated sessions', async () => {
      // Session 1: Create data
      vi.resetModules();
      let storage = (await import('../../shared/storage.js')).default;
      let templateManager = (await import('../../shared/template-manager.js'))
        .default;
      let historyManager = (await import('../../shared/history-manager.js'))
        .default;

      await templateManager.init();
      await historyManager.init();

      const template = await templateManager.createTemplate({
        name: 'Persistent Template',
        prompt: 'Test {var}',
      });

      await historyManager.addHistoryEntry(
        template.id,
        template.name,
        { var: 'value' },
        'Result',
        'completed'
      );

      await storage.setSettings({
        provider: 'openai',
        apiKey: 'persisted-key',
        theme: 'dark',
      });

      // Session 2: Verify data persists
      vi.resetModules();
      storage = (await import('../../shared/storage.js')).default;
      templateManager = (await import('../../shared/template-manager.js'))
        .default;
      historyManager = (await import('../../shared/history-manager.js'))
        .default;

      await templateManager.init();
      await historyManager.init();

      // Verify templates
      const templates = await templateManager.getAllTemplates();
      const found = templates.find((t) => t.name === 'Persistent Template');
      expect(found).toBeDefined();

      // Verify history
      const history = await historyManager.getAllHistory();
      expect(history.length).toBeGreaterThan(0);

      // Verify settings
      const settings = await storage.getSettings();
      expect(settings.provider).toBe('openai');
      expect(settings.apiKey).toBe('persisted-key');
      expect(settings.theme).toBe('dark');
    });
  });
});

describe('E2E: Concurrent Operations', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  describe('Workflow: Multiple simultaneous operations', () => {
    it('should handle concurrent template creations', async () => {
      vi.resetModules();
      const templateManager = (await import('../../shared/template-manager.js'))
        .default;
      await templateManager.init();

      // Create multiple templates concurrently
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        templateManager.createTemplate({
          name: `Concurrent Template ${i}`,
          prompt: `Process {input${i}}`,
        })
      );

      const results = await Promise.all(createPromises);

      // All should succeed
      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.name).toBe(`Concurrent Template ${i}`);
      });

      // All should be persisted
      const templates = await templateManager.getAllTemplates();
      expect(
        templates.filter((t) => t.name.startsWith('Concurrent'))
      ).toHaveLength(5);
    });

    it('should handle concurrent history additions', async () => {
      vi.resetModules();
      const historyManager = (await import('../../shared/history-manager.js'))
        .default;
      await historyManager.init();

      // Add multiple history entries concurrently
      const addPromises = Array.from({ length: 10 }, (_, i) =>
        historyManager.addHistoryEntry(
          `template-${i}`,
          `Template ${i}`,
          { input: `value-${i}` },
          `Result ${i}`,
          'completed'
        )
      );

      const results = await Promise.all(addPromises);

      // All should succeed
      expect(results).toHaveLength(10);

      // All should be in history
      const history = await historyManager.getAllHistory();
      expect(history.length).toBeGreaterThanOrEqual(10);
    });
  });
});
