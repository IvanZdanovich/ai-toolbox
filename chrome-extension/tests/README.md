# Integration Tests

Test tree mirrors the app tree: `tests/integration/<app-folder>/<module>.integration.test.js`. A moved or renamed source file's test lives at the matching path — check there first.

```
tests/
├── integration/
│   ├── shared/
│   │   ├── template-manager.integration.test.js
│   │   ├── history-manager.integration.test.js
│   │   ├── ai-service.integration.test.js
│   │   ├── storage.integration.test.js
│   │   ├── workflow-manager.integration.test.js
│   │   ├── agent-runtime.integration.test.js
│   │   ├── providers.integration.test.js
│   │   ├── icon-helper.integration.test.js
│   │   └── components/
│   │       ├── modal.integration.test.js
│   │       └── toast.integration.test.js
│   ├── background/
│   │   └── background.integration.test.js
│   ├── sidepanel/
│   │   └── sidepanel.integration.test.js
│   └── e2e-workflows.integration.test.js   # cross-module scenarios; no single source file to mirror
├── mocks/
│   └── chrome-api.mock.js
├── fixtures/
│   └── test-data.js
└── setup.js
```

Not yet covered: `shared/components/editor-tab.js` (1200+ lines — pending a split before it gets a suite), `settings/settings.js`, `content/content.js`.

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific file
npm run test -- template-manager

# Run in watch mode
npm run test:watch
```

## Coverage Targets

| Metric     | Target |
| ---------- | ------ |
| Branches   | 70%    |
| Functions  | 70%    |
| Lines      | 70%    |
| Statements | 70%    |
