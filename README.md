# AI Toolbox

A Chrome extension that provides an AI-powered template toolbox for automating routine tasks. Create reusable prompt
templates, process them with various AI providers, and manage your prompt history — all from a convenient side panel.

## Features

- **Template Management**: Create, edit, and organize reusable prompt templates with customizable input variables
- **Multi-Provider Support**: Connect to multiple AI providers:
    - OpenAI (GPT models)
    - Anthropic Claude
    - Google Gemini
    - Meta Llama
    - xAI Grok
    - Mock mode for development/testing
- **Side Panel UI**: Quick access to templates and history without leaving your current tab
- **Prompt History**: Track all processed templates with timestamps and results
- **Import/Export**: Backup and restore your templates as JSON

## Project Structure

```
chrome-extension/
├── manifest.json          # Extension manifest (MV3)
├── background/            # Service worker
├── content/               # Content scripts
├── sidepanel/             # Side panel UI
├── settings/              # Settings page
├── shared/                # Shared utilities
│   ├── ai-service.js      # AI provider integrations
│   ├── template-manager.js # Template CRUD operations
│   ├── history-manager.js # History management
│   ├── storage.js         # Chrome storage wrapper
│   └── components/        # Reusable UI components
├── styles/                # Global CSS (variables, base, components)
└── tests/                 # Test suites
```

## Local Development Setup

### Prerequisites

- Node.js 20+
- npm
- Google Chrome (or Chromium-based browser)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/IvanZdanovich/ai-toolbox.git
   cd ai-toolbox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Load the extension in Chrome**
    - Open `chrome://extensions/`
    - Enable **Developer mode** (toggle in top-right)
    - Click **Load unpacked**
    - Select the `chrome-extension/` directory

### Available Scripts

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run integration tests only
npm run test:integration

# Open Vitest UI
npm run test:ui

# Lint all files (JS, CSS, HTML)
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Debugging

- **Service Worker**: Go to `chrome://extensions/`, find AI Toolbox, click "service worker" link
- **Side Panel**: Right-click the side panel → "Inspect"
- **Content Scripts**: Open DevTools on any page → Console/Sources

## Usage

1. Click the AI Toolbox icon in Chrome toolbar to open the side panel
2. Go to **Settings** (gear icon) to configure your AI provider and API key
3. Create a new template or use the default ones
4. Fill in the template inputs and click **Run**
5. View results in the **History** tab

## Configuration

In Settings, you can configure:

- **AI Provider**: Select which AI service to use
- **API Key**: Your provider's API key (stored locally, encrypted)
- **Theme**: Auto/Light/Dark mode

## Testing

The project uses Vitest for testing with the following structure:

- `tests/unit/` - Unit tests for individual modules
- `tests/integration/` - Integration tests for workflows
- `tests/mocks/` - Chrome API mocks
- `tests/fixtures/` - Test data

## License

ISC

## Author

Ivan Zdanovich
