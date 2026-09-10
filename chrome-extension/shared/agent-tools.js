import { LIMITS } from './constants.js';

/**
 * Tools an `agent` workflow step can call.
 *
 * Each tool declares an OpenAI-style JSON-schema signature (the adapters in
 * ai-service.js translate it for Anthropic and Gemini) plus a `run` that
 * returns a string. Tools are opt-in per step, so a workflow only ever exposes
 * what its author enabled.
 */

const MAX_CHARS = LIMITS.MAX_TOOL_OUTPUT_CHARS;

function clamp(text, maxChars = MAX_CHARS) {
  const limit = Math.min(Number(maxChars) || MAX_CHARS, MAX_CHARS);
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}\n\n[truncated — ${text.length - limit} more characters]`;
}

// Extracts readable text from an HTML document. DOMParser is available on
// extension pages; the regex path keeps this usable from a service worker.
function htmlToText(html) {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript, svg').forEach((node) => {
      node.remove();
    });
    return (doc.body?.innerText || doc.body?.textContent || '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab to read');
  }
  return tab;
}

export const AGENT_TOOLS = {
  read_page: {
    name: 'read_page',
    label: 'Read current page',
    description:
      'Read the visible text of the page in the user\'s active browser tab. Use this when the task refers to "this page", "the article I am reading", or the current site.',
    parameters: {
      type: 'object',
      properties: {
        max_chars: {
          type: 'integer',
          description: `Maximum characters to return (default ${MAX_CHARS}).`,
        },
      },
      required: [],
    },
    async run(args) {
      const tab = await getActiveTab();
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          title: document.title,
          url: location.href,
          text: document.body?.innerText || '',
        }),
      });

      const page = injection?.result;
      if (!page) {
        throw new Error('Could not read the active tab');
      }

      return clamp(
        `# ${page.title}\nURL: ${page.url}\n\n${page.text.trim()}`,
        args.max_chars
      );
    },
  },

  fetch_url: {
    name: 'fetch_url',
    label: 'Fetch a URL',
    description:
      'Fetch a public web page or API endpoint over HTTP(S) and return its text content. Use this to look up information the prompt does not contain.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Absolute http(s) URL to fetch.',
        },
        max_chars: {
          type: 'integer',
          description: `Maximum characters to return (default ${MAX_CHARS}).`,
        },
      },
      required: ['url'],
    },
    async run(args) {
      let target;
      try {
        target = new URL(args.url);
      } catch {
        throw new Error(`Not a valid URL: ${args.url}`);
      }

      if (!/^https?:$/.test(target.protocol)) {
        throw new Error('Only http(s) URLs can be fetched');
      }

      const response = await fetch(target.href, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }

      const body = await response.text();
      const contentType = response.headers.get('content-type') || '';
      const text = contentType.includes('html') ? htmlToText(body) : body;

      return clamp(`URL: ${target.href}\n\n${text}`, args.max_chars);
    },
  },

  run_template: {
    name: 'run_template',
    label: 'Run a saved template',
    description:
      'Run one of the user\'s saved prompt templates and return its output. Use this to reuse an existing, well-tuned prompt instead of rewriting it.',
    parameters: {
      type: 'object',
      properties: {
        template_name: {
          type: 'string',
          description: 'Name of the saved template to run.',
        },
        inputs: {
          type: 'object',
          description:
            'Values for the template variables, keyed by variable name.',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['template_name'],
    },
    async run(args, context) {
      const templates = await context.templateManager.getAllTemplates();
      const wanted = String(args.template_name || '').toLowerCase();
      const template = templates.find(
        (candidate) => candidate.name.toLowerCase() === wanted
      );

      if (!template) {
        return `No template named "${args.template_name}". Available templates: ${
          templates.map((candidate) => candidate.name).join(', ') || 'none'
        }`;
      }

      const result = await context.aiService.processTemplate(
        template,
        args.inputs || {}
      );
      return clamp(result.result);
    },
  },
};

export const AGENT_TOOL_NAMES = Object.keys(AGENT_TOOLS);

/** Resolves enabled tool names to definitions, ignoring unknown entries. */
export function resolveTools(names = []) {
  return names.map((name) => AGENT_TOOLS[name]).filter(Boolean);
}