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
npm test          # Run tests
npm run lint      # Check code quality
```

## License

MIT

## Author

Ivan Zdanovich
