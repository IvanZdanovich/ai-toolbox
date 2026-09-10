import aiService from './ai-service.js';
import templateManager from './template-manager.js';
import { replaceVariables } from './helpers.js';
import { LIMITS, RUN_STATUS, WORKFLOW_STEP_TYPES } from './constants.js';
import { resolveTools } from './agent-tools.js';

/**
 * Executes workflows step by step against a shared context.
 *
 * Progress is reported through `onEvent` so the UI can show the run as it
 * happens; the returned summary is what gets stored in history.
 */

const AGENT_SYSTEM_PROMPT = `You are an autonomous agent working inside the user's browser.

Work the task with the tools you have been given rather than answering from
memory when a tool could give you the real answer. Call tools one step at a
time and use what they return.

When you have enough to answer, stop calling tools and reply with the finished
answer as plain prose or markdown — no meta-commentary about your process.`;

function abortIfCancelled(signal) {
  if (signal?.aborted) {
    throw new Error('Run cancelled');
  }
}

export class AgentRuntime {
  constructor(deps = {}) {
    this.aiService = deps.aiService || aiService;
    this.templateManager = deps.templateManager || templateManager;
  }

  /**
   * @returns {Promise<{output: string, steps: Array, duration: number}>}
   */
  async runWorkflow(workflow, inputs = {}, options = {}) {
    const { onEvent = () => {}, signal } = options;
    const startedAt = Date.now();

    const context = { ...inputs };
    const stepResults = [];
    let previous = '';

    onEvent({ type: 'workflow-start', workflow });

    for (const step of workflow.steps) {
      abortIfCancelled(signal);

      const stepStart = Date.now();
      onEvent({ type: 'step-start', step, status: RUN_STATUS.RUNNING });

      try {
        const output = await this.runStep(step, context, { onEvent, signal });

        previous = output;
        context[`steps.${step.outputKey}`] = output;
        context.previous = output;

        const record = {
          stepId: step.id,
          name: step.name,
          type: step.type,
          outputKey: step.outputKey,
          status: RUN_STATUS.COMPLETED,
          output,
          duration: Date.now() - stepStart,
        };
        stepResults.push(record);
        onEvent({ type: 'step-complete', step, result: record });
      } catch (error) {
        const record = {
          stepId: step.id,
          name: step.name,
          type: step.type,
          outputKey: step.outputKey,
          status: RUN_STATUS.FAILED,
          error: error.message,
          duration: Date.now() - stepStart,
        };
        stepResults.push(record);
        onEvent({ type: 'step-error', step, result: record });

        // A later step is written against the earlier one's output, so there is
        // nothing sensible to continue with.
        const failure = new Error(`Step "${step.name}" failed: ${error.message}`);
        failure.steps = stepResults;
        throw failure;
      }
    }

    const summary = {
      output: previous,
      steps: stepResults,
      duration: Date.now() - startedAt,
    };
    onEvent({ type: 'workflow-complete', ...summary });
    return summary;
  }

  async runStep(step, context, { onEvent, signal }) {
    switch (step.type) {
      case WORKFLOW_STEP_TYPES.AGENT:
        return this.runAgentStep(step, context, { onEvent, signal });
      case WORKFLOW_STEP_TYPES.TEMPLATE:
        return this.runTemplateStep(step, context);
      case WORKFLOW_STEP_TYPES.PROMPT:
      default:
        return this.runPromptStep(step, context);
    }
  }

  async runPromptStep(step, context) {
    const { content } = await this.aiService.chat({
      messages: [{ role: 'user', content: this.render(step.prompt, context) }],
      provider: step.provider,
      model: step.model,
    });

    return content || '';
  }

  async runTemplateStep(step, context) {
    const template = await this.templateManager.getTemplate(step.templateId);
    if (!template) {
      throw new Error('The template this step runs no longer exists');
    }

    // Template variables are filled from the shared context by name, so a
    // template slots into a workflow without any extra wiring.
    const result = await this.aiService.processTemplate(template, context, {
      provider: step.provider,
      model: step.model,
    });

    return result.result;
  }

  async runAgentStep(step, context, { onEvent, signal }) {
    const tools = resolveTools(step.tools);
    const maxIterations = Math.min(
      step.maxIterations || LIMITS.DEFAULT_AGENT_ITERATIONS,
      LIMITS.MAX_AGENT_ITERATIONS
    );

    const messages = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      { role: 'user', content: this.render(step.prompt, context) },
    ];

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      abortIfCancelled(signal);
      onEvent({ type: 'agent-iteration', step, iteration, maxIterations });

      const response = await this.aiService.chat({
        messages,
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
        provider: step.provider,
        model: step.model,
      });

      if (!response.toolCalls?.length) {
        return response.content || '';
      }

      messages.push({
        role: 'assistant',
        content: response.content || '',
        toolCalls: response.toolCalls,
      });

      for (const call of response.toolCalls) {
        abortIfCancelled(signal);
        const output = await this.invokeTool(call, tools, { onEvent, step });
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          name: call.name,
          content: output,
        });
      }
    }

    // Budget spent while still calling tools: ask once more, tools withheld, so
    // the step always produces an answer rather than an empty result.
    onEvent({ type: 'agent-budget-exhausted', step, maxIterations });
    const final = await this.aiService.chat({
      messages: [
        ...messages,
        {
          role: 'user',
          content:
            'You have used your tool budget for this step. Answer now with what you have, and say plainly what you could not determine.',
        },
      ],
      provider: step.provider,
      model: step.model,
    });

    return final.content || '';
  }

  async invokeTool(call, tools, { onEvent, step }) {
    const tool = tools.find((candidate) => candidate.name === call.name);
    onEvent({ type: 'tool-call', step, tool: call.name, args: call.args });

    if (!tool) {
      return `Error: no tool named "${call.name}" is available in this step.`;
    }

    try {
      const output = await tool.run(call.args || {}, {
        aiService: this.aiService,
        templateManager: this.templateManager,
      });
      onEvent({ type: 'tool-result', step, tool: call.name, output });
      return output;
    } catch (error) {
      // Returned rather than thrown: a failed tool is information the model can
      // recover from, so the loop continues instead of killing the run.
      onEvent({
        type: 'tool-error',
        step,
        tool: call.name,
        error: error.message,
      });
      return `Error running ${call.name}: ${error.message}`;
    }
  }

  render(prompt, context) {
    return replaceVariables(prompt || '', context);
  }
}

export default new AgentRuntime();
