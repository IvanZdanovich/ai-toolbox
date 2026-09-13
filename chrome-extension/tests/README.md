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
│   │       ├── toast.integration.test.js
│   │       └── editor-tab.integration.test.js   # wiring smoke test; see note below
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

`shared/components/editor-tab/` is one class (constructor, DOM helpers, dispatch by type/mode) split across `index.js`, `template-edit.js`, `template-run.js`, `workflow-edit.js`, and `workflow-run.js`, mixed onto one prototype via `Object.assign` in `index.js`. `editor-tab.integration.test.js` only checks that each of the four type/mode combinations renders and initializes without throwing — it is not a full behavioral suite per mode (form validation, AI-generation flows, step reordering, etc. are still uncovered).

Not yet covered: `settings/settings.js`, `content/content.js`.

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
