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
} from '../../support/chrome-api.mock.js';
import { AGENT_TOOLS } from '../../../chrome-extension/shared/agent-tools.js';

// The runtime pulls in ai-service, which touches chrome.storage at import time;
// the runtime under test is driven through injected doubles anyway.
vi.mock('../../../chrome-extension/shared/storage.js', () => ({
  default: {
    getSettings: vi.fn().mockResolvedValue({ provider: 'mock' }),
    setSettings: vi.fn().mockResolvedValue(true),
    getTemplates: vi.fn().mockResolvedValue([]),
    setTemplates: vi.fn().mockResolvedValue(true),
    getTemplatesSeeded: vi.fn().mockResolvedValue(true),
    setTemplatesSeeded: vi.fn().mockResolvedValue(true),
  },
}));

const { AgentRuntime } =
  await import('../../../chrome-extension/shared/agent-runtime.js');

const step = (overrides = {}) => ({
  id: overrides.id || `step-${Math.random().toString(36).slice(2)}`,
  name: 'Step',
  type: 'prompt',
  outputKey: 'out',
  prompt: 'Do something',
  ...overrides,
});

const workflow = (steps) => ({ id: 'wf-1', name: 'Flow', steps });

describe('AgentRuntime: Given the agent runtime over a doubled AI service', () => {
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

  describe('AgentRuntime: When prompt steps run in sequence', () => {
    it('AgentRuntime: Then it fills run inputs into the first step', async () => {
      aiService.chat.mockResolvedValue({ content: 'done', toolCalls: [] });

      await runtime.runWorkflow(
        workflow([step({ prompt: 'Write about {topic}' })]),
        { topic: 'otters' }
      );

      expect(aiService.chat.mock.calls[0][0].messages[0].content).toBe(
        'Write about otters'
      );
    });

    it('AgentRuntime: Then it passes each step output to the next via {steps.key}', async () => {
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

    it('AgentRuntime: Then it exposes the last output as {previous}', async () => {
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

    it('AgentRuntime: Then it honours a per-step provider and model override', async () => {
      aiService.chat.mockResolvedValue({ content: 'ok', toolCalls: [] });

      await runtime.runWorkflow(
        workflow([step({ provider: 'ollama', model: 'qwen3' })])
      );

      expect(aiService.chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'ollama', model: 'qwen3' })
      );
    });
  });

  describe('AgentRuntime: When the agent calls a tool', () => {
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

    it('AgentRuntime: Then it runs the tool the model asked for and feed back the result', async () => {
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

    it('AgentRuntime: Then it only offers the tools the step enabled', async () => {
      aiService.chat.mockResolvedValue({ content: 'done', toolCalls: [] });

      await runtime.runWorkflow(workflow([agentStep]));

      expect(aiService.chat.mock.calls[0][0].tools.map((t) => t.name)).toEqual([
        'fetch_url',
      ]);
    });

    it('AgentRuntime: Then it returns the tool error to the model instead of failing the run', async () => {
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

    it('AgentRuntime: Then it tells the model when it asks for a tool the step lacks', async () => {
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

    it('AgentRuntime: Then it stops at the iteration budget and force a final answer', async () => {
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

  describe('AgentRuntime: When a template step runs', () => {
    it('AgentRuntime: Then it runs the referenced template with the shared context', async () => {
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

    it('AgentRuntime: Then it fails clearly when the template was deleted', async () => {
      templateManager.getTemplate.mockResolvedValue(undefined);

      await expect(
        runtime.runWorkflow(
          workflow([step({ type: 'template', templateId: 'gone' })])
        )
      ).rejects.toThrow('no longer exists');
    });
  });

  describe('AgentRuntime: When a step fails or the run is cancelled', () => {
    it('AgentRuntime: Then it stops the run when a step fails and report which one', async () => {
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

    it('AgentRuntime: Then it stops between steps when the run is cancelled', async () => {
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

  describe('AgentRuntime: When progress is reported', () => {
    it('AgentRuntime: Then it reports start and completion for every step', async () => {
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

    it('AgentRuntime: Then it reports tool activity during an agent step', async () => {
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
