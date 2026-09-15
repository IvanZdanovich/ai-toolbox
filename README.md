# AI Toolbox

A Chrome extension that provides an AI-powered template toolbox for automating routine tasks. Create reusable prompt templates, chain them into agentic workflows, run them against cloud or local models, and keep your history.

## Features

- Reusable prompt templates with custom variables
- **Agentic workflows** — chain prompts, saved templates and tool-using agents into one repeatable run
- Cloud and **local** AI providers, with per-provider model and endpoint settings
- Side panel UI for quick access
- Prompt and workflow history tracking
- Import/Export templates and workflows

## Agentic workflows

A workflow is an ordered list of steps that share one context. Three step types:

| Type         | What it does                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Prompt**   | One model call.                                                                                                                |
| **Agent**    | A tool-calling loop: the model calls tools, reads the results, and repeats until it can answer or spends its iteration budget. |
| **Template** | Runs one of your saved templates, filling its variables from the workflow context.                                             |

Each step writes its output under an **output key**. Later steps reference it as
`{steps.output_key}`, or `{previous}` for the step just before. Any other
`{placeholder}` becomes an input you fill in when you run the workflow.

Tools an agent step can be given:

- **Read current page** — the visible text of your active browser tab
- **Fetch a URL** — retrieves a public page or API endpoint as text
- **Run a saved template** — reuses one of your existing prompts

Tools are opt-in per step, agent loops are bounded by a per-step iteration
budget, and a run can be stopped mid-flight. Three starter workflows (Research
Brief, Page to Action Items, Draft/Critique/Revise) are seeded on first launch.

## Supported providers

**Cloud:** OpenAI (GPT-6 / GPT-5.x), Anthropic Claude (Opus 5, Sonnet 5, Fable 5,
Haiku 4.5), Google Gemini 3.x, xAI Grok 4.x, Mistral, DeepSeek, Groq, OpenRouter.

**Local:** Ollama (`http://localhost:11434/v1`), llama.cpp `llama-server`
(`http://localhost:8080/v1`), LM Studio (`http://localhost:1234/v1`), plus a
**Custom** option for any OpenAI-compatible endpoint. Local providers need no API
key, take a configurable endpoint URL, and the settings page can list the models
your server is actually serving.

Every provider works with agent steps: tool definitions are translated to each
API's native format (OpenAI functions, Anthropic `input_schema`, Gemini function
declarations). You can also override the provider and model per workflow step —
run a cheap local model for extraction and a frontier model for the final write-up.

## Installation

### Load the Extension (Chrome/Edge)

1. **Download or clone this repository**

   ```bash
   git clone https://github.com/IvanZdanovich/ai-toolbox.git
   ```

2. **Open your browser's extension page**
   - **Chrome**: Navigate to `chrome://extensions/`
   - **Edge**: Navigate to `edge://extensions/`

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the extension**
   - Click "Load unpacked" button
   - Navigate to and select the `chrome-extension/` folder from this project
   - The extension icon should appear in your browser toolbar

5. **Start using AI Toolbox**
   - Click the extension icon to open the side panel
   - Go to Settings to configure your AI provider and API key
   - Create templates and start automating!

## Usage

1. Click the AI Toolbox icon in your browser toolbar
2. In Settings, pick a provider, then set its API key (or endpoint URL for a local
   server) and model. Use **Test** to confirm it works.
3. **Templates** tab: pick a template, fill in the variables, click Run
4. **Workflows** tab: pick a workflow, fill in its inputs, and watch each step
   run — including which tools an agent step calls
5. View results in the History tab

## Development

### Prerequisites

- Node.js 20+
- Chrome or Edge browser

### Setup

```bash
npm install
npm test           # Run the jsdom suite (unit, integration, cross)
npm run lint       # Check code quality
npm run test:e2e   # Drive the shipped UI in a real Chrome (Playwright)
npm run test:smoke # Check the install in a real Chrome (chrome-devtools CLI, optional)
```

`npm run test:e2e` runs the user flows under `reqs/e2e/` with Playwright, in a
real Chrome with the unpacked extension loaded. It needs `npx playwright
install chromium` once, no API key — the flows drive the demo provider — and it
is the only level that touches the shipped UI: a case clicks and types the way
a person does, through the commands, selectors and copy under `reqs/support/`.

`npm run test:smoke` needs the [`chrome-devtools`
CLI](https://github.com/ChromeDevTools/chrome-devtools-mcp) on your machine and
opens a real browser; it skips itself if the CLI is missing, and it is not part
of `npm test` or CI. Where the e2e flows are about what a person does, the
smoke checks are about the install — Chrome accepting `manifest.json`, page
modules resolving without a bundler, the service worker registering.

Every spec is `<subject>.spec.js`, with the level in the infix before
it (`.integration.`, `.e2e.`, `.cross.`; bare for unit) — Vitest runs all of
them but `.e2e.`, which is Playwright's — and every case title
reads `Subject: Given/When/Then …` — so the run output names what broke and
what owns it, and `npm test -- --reporter=verbose | grep TemplateManager` lists
what a module is held to. `reqs/rules/spec-titles.rules.js` enforces it.

The extension ships from `chrome-extension/`. Everything that verifies or
justifies it lives in `reqs/`, one flat directory per level: the unit specs in
`reqs/unit/` and the examples they use in `reqs/unit-examples/`, module
contracts in `reqs/integration/`, user flows in `reqs/e2e/` with
`reqs/e2e-examples/`, cross-functional checks in `reqs/cross/`, the browser
smoke checks in `reqs/browser/`, shared doubles, harness, drivers, selectors,
UI commands and copy in `reqs/support/`, the static-analysis rules in
`reqs/rules/`, and the architecture decisions in `reqs/adr/`. Each spec is
named for its subject rather than filed under a copy of the app's tree.
Boundary values are declared once in `chrome-extension/constraints/` and
imported by the app, the examples, the specs and the rules alike;
`reqs/adr/layout/layout.adr.md` records why that directory sits inside the
extension rather than beside it.

## License

MIT

## Author

Ivan Zdanovich
