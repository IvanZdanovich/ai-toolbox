# AI Toolbox

A Chrome extension that provides an AI-powered template toolbox for automating routine tasks. Create reusable prompt templates, chain them into agentic workflows, run them against cloud or local models, and keep your history.

## Features

- Reusable prompt templates with custom variables
- **Voice input and voice control** — dictate into any prompt, input or chat box, and drive the side panel hands-free
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

## Voice

Speech recognition is the browser's own — nothing is sent to your AI provider
and nothing is recorded.

**Voice input (dictation).** A mic button sits next to every field worth
speaking into: the section search boxes, the chat box, template prompts, and
the variable inputs on a template or workflow run. Click it, talk, click again
to stop. What you say is appended to whatever the field already holds.

**Voice control.** The mic in the side panel footer starts continuous command
mode. Say "help" for the list at any time:

| Say                                          | What happens                                            |
| -------------------------------------------- | ------------------------------------------------------- |
| "templates" / "workflows" / "history"        | Switch section                                          |
| "new template" / "new workflow" / "new chat" | Open a fresh editor tab                                 |
| "open \<name>" / "edit \<name>"              | Open that template or workflow                          |
| "search \<text>"                             | Filter the current section                              |
| "ask \<question>"                            | Start a chat with that question                         |
| "send"                                       | Send the open chat message, or run/save the current tab |
| "close"                                      | Close the current editor tab                            |
| "stop"                                       | Stop listening                                          |

Dictation and command mode share the one microphone, so starting either stops
the other.

**First run — you must grant the microphone once.** Chrome only asks for
microphone access from a normal tab, never from a side panel. The first time
you press a mic, AI Toolbox opens a one-purpose tab that immediately shows
Chrome's prompt: click **Allow**, go back to the side panel, and press the mic
again. The grant is per browser profile, so it happens once. Settings › Voice
can reopen that page, and sets the recognition language (it follows your
browser by default).

That page also has a **Check it works** test: press Start and speak, and the
words appear there. If they appear in the tab but not in the side panel, the
problem is the side panel rather than the browser. Either way the side panel's
own DevTools (right-click inside it → Inspect) logs each step — `Voice:
recognition started`, `microphone open`, `speech detected`, `heard "…"` — plus
the recognizer's error code when it fails.

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
