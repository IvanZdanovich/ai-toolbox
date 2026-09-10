/**
 * Agent Runtime Integration Tests
 *
 * Tests workflow execution including:
 * - Sequential steps sharing one context
 * - The agent tool-calling loop
 * - Tool failures and iteration budgets
 * - Step failure and cancellation
 * - Progress events
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../mocks/chrome-api.mock.js';
import { AGENT_TOOLS } from '../../shared/agent-tools.js';

// The runtime pulls in ai-service, which touches chrome.storage at import time;
// the runtime under test is driven through injected doubles anyway.
vi.mock('../../shared/storage.js', () => ({
  default: {
    getSettings: vi.fn().mockResolvedValue({ provider: 'mock' }),
    setSettings: vi.fn().mockResolvedValue(true),
    getTemplates: vi.fn().mockResolvedValue([]),
    setTemplates: vi.fn().mockResolvedValue(true),
    getTemplatesSeeded: vi.fn().mockResolvedValue(true),
    setTemplatesSeeded: vi.fn().mockResolvedValue(true),
  },
}));

const { AgentRuntime } = await import('../../shared/agent-runtime.js');

const step = (overrides = {}) => ({
  id: overrides.id || `step-${Math.random().toString(36).slice(2)}`,
  name: 'Step',
  type: 'prompt',
  outputKey: 'out',
  prompt: 'Do something',
  ...overrides,
});

const workflow = (steps) => ({ id: 'wf-1', name: 'Flow', steps });

describe('Agent Runtime Integration', () => {
  let runtime;
  let aiService;
  let templateManager;

  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();

    aiService = {
      chat: vi.fn(),
      processTemplate: vi.fn(),
    };
    templateManager = {
      getTemplate: vi.fn(),
      getAllTemplates: vi.fn().mockResolvedValue([]),
    };

    runtime = new AgentRuntime({ aiService, templateManager });
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  describe('Scenario: Sequential prompt steps', () => {
    it('should fill run inputs into the first step', async () => {
      aiService.chat.mockResolvedValue({ content: 'done', toolCalls: [] });

      await runtime.runWorkflow(
        workflow([step({ prompt: 'Write about {topic}' })]),
        { topic: 'otters' }
      );

      expect(aiService.chat.mock.calls[0][0].messages[0].content).toBe(
        'Write about otters'
      );
    });

    it('should pass each step output to the next via {steps.key}', async () => {
      aiService.chat
        .mockResolvedValueOnce({ content: 'first output', toolCalls: [] })
        .mockResolvedValueOnce({ content: 'second output', toolCalls: [] });

      const run = await runtime.runWorkflow(
        workflow([
          step({ id: 's1', outputKey: 'draft', prompt: 'Draft it' }),
          step({
            id: 's2',
            outputKey: 'final',
            prompt: 'Improve: {steps.draft}',
          }),
        ])
      );

      expect(aiService.chat.mock.calls[1][0].messages[0].content).toBe(
        'Improve: first output'
      );
      expect(run.output).toBe('second output');
      expect(run.steps).toHaveLength(2);
    });

    it('should expose the last output as {previous}', async () => {
      aiService.chat
        .mockResolvedValueOnce({ content: 'alpha', toolCalls: [] })
        .mockResolvedValueOnce({ content: 'beta', toolCalls: [] });

      await runtime.runWorkflow(
        workflow([
          step({ id: 's1', outputKey: 'one' }),
          step({ id: 's2', outputKey: 'two', prompt: 'Continue: {previous}' }),
        ])
      );

      expect(aiService.chat.mock.calls[1][0].messages[0].content).toBe(
        'Continue: alpha'
      );
    });

    it('should honour a per-step provider and model override', async () => {
      aiService.chat.mockResolvedValue({ content: 'ok', toolCalls: [] });

      await runtime.runWorkflow(
        workflow([step({ provider: 'ollama', model: 'qwen3' })])
      );

      expect(aiService.chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'ollama', model: 'qwen3' })
      );
    });
  });

  describe('Scenario: Agent tool-calling loop', () => {
    const agentStep = step({
      id: 'agent-1',
      type: 'agent',
      outputKey: 'findings',
      prompt: 'Research {topic}',
      tools: ['fetch_url'],
      maxIterations: 4,
    });

    beforeEach(() => {
      vi.spyOn(AGENT_TOOLS.fetch_url, 'run').mockResolvedValue('page contents');
    });

    it('should run the tool the model asked for and feed back the result', async () => {
      aiService.chat
        .mockResolvedValueOnce({
          content: '',
          toolCalls: [
            {
              id: 'call-1',
              name: 'fetch_url',
              args: { url: 'https://a.test' },
            },
          ],
        })
        .mockResolvedValueOnce({ content: 'the answer', toolCalls: [] });

      const run = await runtime.runWorkflow(workflow([agentStep]), {
        topic: 'otters',
      });

      expect(AGENT_TOOLS.fetch_url.run).toHaveBeenCalledWith(
        { url: 'https://a.test' },
        expect.anything()
      );

      const followUp = aiService.chat.mock.calls[1][0].messages;
      expect(followUp.at(-1)).toMatchObject({
        role: 'tool',
        toolCallId: 'call-1',
        content: 'page contents',
      });
      expect(run.output).toBe('the answer');
    });

    it('should only offer the tools the step enabled', async () => {
      aiService.chat.mockResolvedValue({ content: 'done', toolCalls: [] });

      await runtime.runWorkflow(workflow([agentStep]));

      expect(aiService.chat.mock.calls[0][0].tools.map((t) => t.name)).toEqual([
        'fetch_url',
      ]);
    });

    it('should return the tool error to the model instead of failing the run', async () => {
      AGENT_TOOLS.fetch_url.run.mockRejectedValueOnce(new Error('404 gone'));
      aiService.chat
        .mockResolvedValueOnce({
          content: '',
          toolCalls: [
            {
              id: 'call-1',
              name: 'fetch_url',
              args: { url: 'https://a.test' },
            },
          ],
        })
        .mockResolvedValueOnce({ content: 'recovered', toolCalls: [] });

      const run = await runtime.runWorkflow(workflow([agentStep]));

      expect(aiService.chat.mock.calls[1][0].messages.at(-1).content).toContain(
        '404 gone'
      );
      expect(run.output).toBe('recovered');
    });

    it('should tell the model when it asks for a tool the step lacks', async () => {
      aiService.chat
        .mockResolvedValueOnce({
          content: '',
          toolCalls: [{ id: 'call-1', name: 'read_page', args: {} }],
        })
        .mockResolvedValueOnce({ content: 'fine', toolCalls: [] });

      await runtime.runWorkflow(workflow([agentStep]));

      expect(aiService.chat.mock.calls[1][0].messages.at(-1).content).toContain(
        'no tool named "read_page"'
      );
    });

    it('should stop at the iteration budget and force a final answer', async () => {
      // A model that never stops asking for tools. Only the forced final call
      // — the one made with no tools offered — returns prose.
      aiService.chat.mockImplementation((request) =>
        Promise.resolve(
          request.tools === undefined
            ? { content: 'best effort answer', toolCalls: [] }
            : {
                content: '',
                toolCalls: [
                  {
                    id: 'c',
                    name: 'fetch_url',
                    args: { url: 'https://a.test' },
                  },
                ],
              }
        )
      );

      const run = await runtime.runWorkflow(
        workflow([{ ...agentStep, maxIterations: 2 }])
      );

      // Two budgeted iterations plus the tools-withheld final call.
      expect(aiService.chat).toHaveBeenCalledTimes(3);
      expect(run.output).toBe('best effort answer');
    });
  });

  describe('Scenario: Template steps', () => {
    it('should run the referenced template with the shared context', async () => {
      const template = { id: 't1', name: 'Summary', prompt: 'Sum {text}' };
      templateManager.getTemplate.mockResolvedValue(template);
      aiService.processTemplate.mockResolvedValue({ result: 'summary text' });

      const run = await runtime.runWorkflow(
        workflow([step({ type: 'template', templateId: 't1' })]),
        { text: 'a long article' }
      );

      expect(aiService.processTemplate).toHaveBeenCalledWith(
        template,
        expect.objectContaining({ text: 'a long article' }),
        expect.anything()
      );
      expect(run.output).toBe('summary text');
    });

    it('should fail clearly when the template was deleted', async () => {
      templateManager.getTemplate.mockResolvedValue(undefined);

      await expect(
        runtime.runWorkflow(
          workflow([step({ type: 'template', templateId: 'gone' })])
        )
      ).rejects.toThrow('no longer exists');
    });
  });

  describe('Scenario: Failure and cancellation', () => {
    it('should stop the run when a step fails and report which one', async () => {
      aiService.chat
        .mockResolvedValueOnce({ content: 'ok', toolCalls: [] })
        .mockRejectedValueOnce(new Error('provider exploded'));

      const promise = runtime.runWorkflow(
        workflow([
          step({ id: 's1', name: 'First', outputKey: 'one' }),
          step({ id: 's2', name: 'Second', outputKey: 'two' }),
          step({ id: 's3', name: 'Third', outputKey: 'three' }),
        ])
      );

      await expect(promise).rejects.toThrow(
        'Step "Second" failed: provider exploded'
      );
      // The third step never runs: it is written against the second's output.
      expect(aiService.chat).toHaveBeenCalledTimes(2);
    });

    it('should stop between steps when the run is cancelled', async () => {
      const controller = new AbortController();
      aiService.chat.mockImplementation(async () => {
        controller.abort();
        return { content: 'ok', toolCalls: [] };
      });

      await expect(
        runtime.runWorkflow(
          workflow([
            step({ id: 's1', outputKey: 'a' }),
            step({ id: 's2', outputKey: 'b' }),
          ]),
          {},
          { signal: controller.signal }
        )
      ).rejects.toThrow('cancelled');

      expect(aiService.chat).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario: Progress events', () => {
    it('should report start and completion for every step', async () => {
      aiService.chat.mockResolvedValue({ content: 'ok', toolCalls: [] });
      const events = [];

      await runtime.runWorkflow(
        workflow([step()]),
        {},
        {
          onEvent: (event) => events.push(event.type),
        }
      );

      expect(events).toEqual([
        'workflow-start',
        'step-start',
        'step-complete',
        'workflow-complete',
      ]);
    });

    it('should report tool activity during an agent step', async () => {
      vi.spyOn(AGENT_TOOLS.read_page, 'run').mockResolvedValue('page text');
      aiService.chat
        .mockResolvedValueOnce({
          content: '',
          toolCalls: [{ id: 'c1', name: 'read_page', args: {} }],
        })
        .mockResolvedValueOnce({ content: 'summary', toolCalls: [] });

      const events = [];
      await runtime.runWorkflow(
        workflow([
          step({ type: 'agent', tools: ['read_page'], maxIterations: 3 }),
        ]),
        {},
        { onEvent: (event) => events.push(event.type) }
      );

      expect(events).toContain('agent-iteration');
      expect(events).toContain('tool-call');
      expect(events).toContain('tool-result');
    });
  });
});
