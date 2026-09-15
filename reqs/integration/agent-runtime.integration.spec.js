/**
 * Agent runtime — integration.
 *
 * Primary module: chrome-extension/shared/agent-runtime.js, whose contract is
 * with ai-service.js (the neutral message/tool shape it sends and the
 * { content, toolCalls } it reads back), with agent-tools.js (what a tool run
 * returns and how a failure is reported) and with template-manager.js (a
 * template step's lookup). All four stay real; only the platform edge is
 * doubled — chrome.* from the mock, and `fetch`, which stands in for both the
 * provider endpoint and anything the fetch_url tool retrieves.
 *
 * A real provider is configured rather than the mock one on purpose: the mock
 * provider never returns tool calls, so the agent loop — the thing this module
 * exists for — is only reachable through an adapter.
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
import { MAX_TOOL_OUTPUT_CHARS } from '../../chrome-extension/constraints/agent.constraints.js';

const AGENT_RUNTIME = '../../chrome-extension/shared/agent-runtime.js';
const TEMPLATE_MANAGER = '../../chrome-extension/shared/template-manager.js';

const CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Replies the doubled endpoint hands back, in order, one per model call.
let chatReplies;
let chatRequests;
let pageReplies;

function modelSays(content, toolCalls = []) {
  return {
    choices: [
      {
        message: {
          content,
          tool_calls: toolCalls.map((call, index) => ({
            id: call.id || `call_${index}`,
            type: 'function',
            function: {
              name: call.name,
              arguments: JSON.stringify(call.args ?? {}),
            },
          })),
        },
      },
    ],
  };
}

function installFetchDouble() {
  globalThis.fetch = vi.fn(async (url, init) => {
    if (String(url) === CHAT_ENDPOINT) {
      chatRequests.push(JSON.parse(init.body));
      const reply = chatReplies.shift();
      if (!reply) {
        throw new Error('The spec ran out of queued model replies');
      }
      return {
        ok: true,
        status: 200,
        json: async () => reply,
      };
    }

    const page = pageReplies.shift();
    if (!page) {
      throw new Error(`Nothing queued for ${url}`);
    }
    return {
      ok: page.ok !== false,
      status: page.status || 200,
      statusText: page.statusText || 'OK',
      headers: { get: () => page.contentType || 'text/plain' },
      text: async () => page.body || '',
      json: async () => ({ error: { message: page.body || 'failed' } }),
    };
  });
}

async function bootRuntime() {
  vi.resetModules();
  const runtime = (await import(AGENT_RUNTIME)).default;
  // Settings are read through storage on first use; a real provider is what
  // puts an adapter — and therefore tool calling — in the path.
  await runtime.aiService.init();
  return runtime;
}

function promptStep(overrides = {}) {
  return {
    id: 'step-1',
    name: 'Draft',
    type: 'prompt',
    outputKey: 'draft',
    prompt: 'Write about {topic}',
    ...overrides,
  };
}

function lastUserMessage(request) {
  return [...request.messages].reverse().find((m) => m.role === 'user').content;
}

describe('AgentRuntime: Given the agent runtime against the real provider and tool registry', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
    testUtils.setStorageState({
      [STORAGE_KEYS.SETTINGS]: {
        provider: 'openai',
        apiKeys: { openai: 'sk-test' },
      },
      [STORAGE_KEYS.TEMPLATES_SEEDED]: true,
    });
    chatReplies = [];
    chatRequests = [];
    pageReplies = [];
    installFetchDouble();
  });

  afterEach(() => {
    uninstallChromeMock();
    delete globalThis.fetch;
    vi.restoreAllMocks();
  });

  describe('AgentRuntime: When context passes between steps', () => {
    it('AgentRuntime: Then it feeds an earlier step output into a later {steps.<key>} reference', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(modelSays('FIRST OUTPUT'), modelSays('second'));

      await runtime.runWorkflow(
        {
          name: 'Two steps',
          steps: [
            promptStep(),
            promptStep({
              id: 'step-2',
              outputKey: 'polished',
              prompt: 'Polish this: {steps.draft}',
            }),
          ],
        },
        { topic: 'otters' }
      );

      expect(lastUserMessage(chatRequests[0])).toContain('otters');
      expect(lastUserMessage(chatRequests[1])).toContain('FIRST OUTPUT');
    });

    it('AgentRuntime: Then it resolves {previous} to the step immediately before', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(modelSays('one'), modelSays('two'), modelSays('three'));

      await runtime.runWorkflow({
        name: 'Chain',
        steps: [
          promptStep({ prompt: 'start' }),
          promptStep({ id: 'step-2', outputKey: 'b', prompt: 'p' }),
          promptStep({
            id: 'step-3',
            outputKey: 'c',
            prompt: 'Use {previous}',
          }),
        ],
      });

      expect(lastUserMessage(chatRequests[2])).toContain('two');
    });

    it('AgentRuntime: Then it returns the last step output as the run result', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(modelSays('one'), modelSays('final answer'));

      const run = await runtime.runWorkflow({
        name: 'Chain',
        steps: [
          promptStep(),
          promptStep({ id: 'step-2', outputKey: 'b', prompt: 'p' }),
        ],
      });

      expect(run.output).toBe('final answer');
      expect(run.steps).toHaveLength(2);
    });
  });

  describe('AgentRuntime: When a step fails', () => {
    it('AgentRuntime: Then it stops the run at the failing step and names it in the error', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(modelSays('one'));
      globalThis.fetch.mockImplementationOnce(async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } }),
      }));

      await expect(
        runtime.runWorkflow({
          name: 'Doomed',
          steps: [promptStep({ name: 'Draft' }), promptStep({ id: 'step-2' })],
        })
      ).rejects.toThrow(/Step "Draft" failed/);
    });

    it('AgentRuntime: Then it carries the step records of the run that failed', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(modelSays('one'));
      chatReplies.push(null); // second call has nothing queued and throws

      const failure = await runtime
        .runWorkflow({
          name: 'Half done',
          steps: [
            promptStep(),
            promptStep({ id: 'step-2', outputKey: 'b', name: 'Polish' }),
          ],
        })
        .catch((error) => error);

      expect(failure.steps).toHaveLength(2);
      expect(failure.steps[0].status).toBe('completed');
      expect(failure.steps[1].status).toBe('failed');
    });

    it('AgentRuntime: Then it reports a template step whose template has been deleted', async () => {
      const runtime = await bootRuntime();

      await expect(
        runtime.runWorkflow({
          name: 'Dangling',
          steps: [
            promptStep({ type: 'template', templateId: 'gone', prompt: '' }),
          ],
        })
      ).rejects.toThrow(/no longer exists/);
    });

    it('AgentRuntime: Then it abandons the run when its signal is aborted', async () => {
      const runtime = await bootRuntime();
      const controller = new AbortController();
      controller.abort();

      await expect(
        runtime.runWorkflow(
          { name: 'Cancelled', steps: [promptStep()] },
          {},
          {
            signal: controller.signal,
          }
        )
      ).rejects.toThrow(/cancelled/i);
    });
  });

  describe('AgentRuntime: When a template step runs', () => {
    it('AgentRuntime: Then it fills a saved template from the shared workflow context', async () => {
      vi.resetModules();
      const runtime = (await import(AGENT_RUNTIME)).default;
      const templateManager = (await import(TEMPLATE_MANAGER)).default;
      await runtime.aiService.init();
      await templateManager.init();
      const template = await templateManager.createTemplate({
        name: 'Greeter',
        prompt: 'Say hello to {name}',
      });
      chatReplies.push(modelSays('Hello Ada'));

      const run = await runtime.runWorkflow(
        {
          name: 'Via template',
          steps: [
            promptStep({
              type: 'template',
              templateId: template.id,
              prompt: '',
              outputKey: 'greeting',
            }),
          ],
        },
        { name: 'Ada' }
      );

      expect(lastUserMessage(chatRequests[0])).toBe('Say hello to Ada');
      expect(run.output).toBe('Hello Ada');
    });
  });

  describe('AgentRuntime: When an agent step runs', () => {
    const agentStep = (overrides = {}) =>
      promptStep({
        type: 'agent',
        tools: ['fetch_url'],
        maxIterations: 3,
        prompt: 'Find out about {topic}',
        ...overrides,
      });

    it('AgentRuntime: Then it sends the enabled tools in the provider wire format', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(modelSays('done'));

      await runtime.runWorkflow({ name: 'Agent', steps: [agentStep()] });

      expect(chatRequests[0].tools).toHaveLength(1);
      expect(chatRequests[0].tools[0].function.name).toBe('fetch_url');
    });

    it('AgentRuntime: Then it runs a requested tool and sends its output back as a tool message', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(
        modelSays('', [
          {
            id: 'call_1',
            name: 'fetch_url',
            args: { url: 'https://example.com/report' },
          },
        ]),
        modelSays('The report says otters are thriving.')
      );
      pageReplies.push({ body: 'Otters are thriving.' });

      const run = await runtime.runWorkflow({
        name: 'Agent',
        steps: [agentStep()],
      });

      const toolMessage = chatRequests[1].messages.find(
        (message) => message.role === 'tool'
      );
      expect(toolMessage.tool_call_id).toBe('call_1');
      expect(toolMessage.content).toContain('Otters are thriving.');
      expect(run.output).toBe('The report says otters are thriving.');
    });

    it('AgentRuntime: Then it hands a failed tool back to the model instead of failing the run', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(
        modelSays('', [
          { id: 'call_1', name: 'fetch_url', args: { url: 'not-a-url' } },
        ]),
        modelSays('I could not reach that page.')
      );

      const run = await runtime.runWorkflow({
        name: 'Agent',
        steps: [agentStep()],
      });

      const toolMessage = chatRequests[1].messages.find(
        (message) => message.role === 'tool'
      );
      expect(toolMessage.content).toMatch(/Error running fetch_url/);
      expect(run.steps[0].status).toBe('completed');
    });

    it('AgentRuntime: Then it tells the model when it asks for a tool the step does not have', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(
        modelSays('', [{ id: 'call_1', name: 'read_page', args: {} }]),
        modelSays('Understood.')
      );

      await runtime.runWorkflow({
        name: 'Agent',
        steps: [agentStep({ tools: ['fetch_url'] })],
      });

      const toolMessage = chatRequests[1].messages.find(
        (message) => message.role === 'tool'
      );
      expect(toolMessage.content).toMatch(/no tool named "read_page"/);
    });

    it('AgentRuntime: Then it asks once more without tools when the iteration budget runs out', async () => {
      const runtime = await bootRuntime();
      const toolCall = [
        {
          id: 'call_1',
          name: 'fetch_url',
          args: { url: 'https://example.com' },
        },
      ];
      chatReplies.push(
        modelSays('', toolCall),
        modelSays('', toolCall),
        modelSays('', toolCall),
        modelSays('Here is what I have so far.')
      );
      pageReplies.push({ body: 'a' }, { body: 'b' }, { body: 'c' });

      const run = await runtime.runWorkflow({
        name: 'Agent',
        steps: [agentStep({ maxIterations: 3 })],
      });

      expect(chatRequests).toHaveLength(4);
      expect(chatRequests[3].tools).toBeUndefined();
      expect(run.output).toBe('Here is what I have so far.');
    });

    it('AgentRuntime: Then it truncates tool output rather than sending the whole page back', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(
        modelSays('', [
          {
            id: 'call_1',
            name: 'fetch_url',
            args: { url: 'https://example.com/big' },
          },
        ]),
        modelSays('Read it.')
      );
      pageReplies.push({ body: 'x'.repeat(MAX_TOOL_OUTPUT_CHARS * 2) });

      await runtime.runWorkflow({ name: 'Agent', steps: [agentStep()] });

      const toolMessage = chatRequests[1].messages.find(
        (message) => message.role === 'tool'
      );
      expect(toolMessage.content).toContain('[truncated');
      expect(toolMessage.content.length).toBeLessThan(
        MAX_TOOL_OUTPUT_CHARS * 2
      );
    });
  });

  describe('AgentRuntime: When progress is reported', () => {
    it('AgentRuntime: Then it reports each step starting and completing, in run order', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(modelSays('one'), modelSays('two'));
      const events = [];

      await runtime.runWorkflow(
        {
          name: 'Watched',
          steps: [
            promptStep(),
            promptStep({ id: 'step-2', outputKey: 'b', prompt: 'p' }),
          ],
        },
        {},
        { onEvent: (event) => events.push(event.type) }
      );

      expect(events).toEqual([
        'workflow-start',
        'step-start',
        'step-complete',
        'step-start',
        'step-complete',
        'workflow-complete',
      ]);
    });

    it('AgentRuntime: Then it reports a tool call and its result as they happen', async () => {
      const runtime = await bootRuntime();
      chatReplies.push(
        modelSays('', [
          {
            id: 'call_1',
            name: 'fetch_url',
            args: { url: 'https://example.com' },
          },
        ]),
        modelSays('done')
      );
      pageReplies.push({ body: 'page text' });
      const events = [];

      await runtime.runWorkflow(
        {
          name: 'Watched agent',
          steps: [
            promptStep({ type: 'agent', tools: ['fetch_url'], prompt: 'go' }),
          ],
        },
        {},
        { onEvent: (event) => events.push(event) }
      );

      const toolCall = events.find((event) => event.type === 'tool-call');
      const toolResult = events.find((event) => event.type === 'tool-result');
      expect(toolCall.tool).toBe('fetch_url');
      expect(toolResult.output).toContain('page text');
    });
  });
});
