# AI Toolbox

A Chrome extension that provides an AI-powered template toolbox for automating routine tasks. Create reusable prompt templates, process them with AI providers, and manage your prompt history.

## Features

- Create and manage reusable prompt templates with custom variables
- Support for multiple AI providers (OpenAI, Anthropic, Google Gemini, Meta Llama, xAI Grok)
- Side panel UI for quick access
- Prompt history tracking
- Import/Export templates

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
2. Configure your AI provider and API key in Settings
3. Create or select a template
4. Fill in the variables and click Run
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

ISC

## Author

Ivan Zdanovich
