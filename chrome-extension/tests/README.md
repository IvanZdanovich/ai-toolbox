# Integration Test Scenarios

This document describes all integration test scenarios organized by component.

## Test Structure

```
tests/
├── integration/
│   ├── template-manager.integration.test.js    # Template CRUD, validation, search
│   ├── history-manager.integration.test.js     # History recording, filtering, limits
│   ├── ai-service.integration.test.js          # AI processing, providers, rate limiting
│   ├── storage.integration.test.js             # Storage operations, caching, persistence
│   ├── sidepanel.integration.test.js           # UI interactions, rendering, state
│   ├── background.integration.test.js          # Service worker, messaging, context menus
│   └── e2e-workflows.integration.test.js       # Complete user workflows
├── mocks/
│   └── chrome-api.mock.js                      # Chrome Extension API mock
├── fixtures/
│   └── test-data.js                            # Test fixtures and factories
└── setup.js                                    # Global test setup
```

---

## Component: Template Manager

### Scenarios

| Scenario | Description | Status |
|----------|-------------|--------|
| First-time user creates first template | Initialize with empty templates, seed defaults, create new template | ✅ |
| User manages existing templates | Retrieve, update, delete operations | ✅ |
| User searches templates | Search by name, description, handle empty results | ✅ |
| Template variable extraction | Extract {variables} from prompts | ✅ |
| Template limit enforcement | Enforce max 50 templates | ✅ |
| Event emission | Emit events on CRUD operations | ✅ |
| Error handling | Handle storage errors gracefully | ✅ |

### Key Test Cases

1. **Create Template**
   - Valid data → Creates template with ID, timestamps
   - Invalid data → Rejects with validation error
   - At limit → Handles gracefully

2. **Update Template**
   - Updates name, description, prompt
   - Updates `updatedAt` timestamp
   - Returns updated template

3. **Delete Template**
   - Removes from list
   - Clears from storage
   - Emits delete event

4. **Search Templates**
   - Matches by name
   - Matches by description
   - Case insensitive
   - Returns all for empty query

---

## Component: History Manager

### Scenarios

| Scenario | Description | Status |
|----------|-------------|--------|
| First execution recording | Initialize empty, record first entry | ✅ |
| History retrieval | Get all, filter by template, get by ID | ✅ |
| History search | Search by template name, result content | ✅ |
| Status tracking | Record completed, failed, processing states | ✅ |
| Limit enforcement | Enforce max 100 entries, remove oldest | ✅ |
| History clearing | Clear all, clear by template | ✅ |
| Error handling | Handle storage errors, non-existent entries | ✅ |

### Key Test Cases

1. **Add History Entry**
   - Records templateId, name, inputs, result, status
   - Generates ID and timestamp
   - Persists to storage

2. **Update History Entry**
   - Update status from processing → completed
   - Update result and duration
   - Handle non-existent entry

3. **Search History**
   - Search in template names
   - Search in results
   - Handle no matches

---

## Component: AI Service

### Scenarios

| Scenario | Description | Status |
|----------|-------------|--------|
| Mock provider processing | Process template, get mock response | ✅ |
| OpenAI provider | API calls, error handling | ✅ |
| Claude provider | API calls with correct headers | ✅ |
| Rate limiting | Allow within limit, reject excess, reset after window | ✅ |
| Provider configuration | Require API key, switch providers | ✅ |
| Connection testing | Test connection success/failure | ✅ |
| Error scenarios | Malformed responses, timeouts, JSON errors | ✅ |

### Key Test Cases

1. **Process Template**
   - Replace variables in prompt
   - Track processing duration
   - Return result with metadata

2. **Rate Limiting**
   - Track requests per window (60s)
   - Allow 20 requests per window
   - Clear old timestamps

3. **Provider Switching**
   - Reinitialize with new settings
   - Use correct API endpoints
   - Handle missing API keys

---

## Component: Storage Service

### Scenarios

| Scenario | Description | Status |
|----------|-------------|--------|
| Basic CRUD | Store, retrieve, update, remove, clear | ✅ |
| Cache behavior | Cache hits, invalidation on write | ✅ |
| Templates storage | Store/retrieve template arrays | ✅ |
| History storage | Store/retrieve history arrays | ✅ |
| Settings storage | Merge with defaults | ✅ |
| Chunked storage | Handle data > 8KB | ✅ |
| Storage info | Report usage and limits | ✅ |
| Error handling | Quota exceeded, corrupted data | ✅ |

### Key Test Cases

1. **Get/Set**
   - Store objects, arrays, primitives
   - Retrieve exact values
   - Handle non-existent keys

2. **Caching**
   - Return cached value on second read
   - Invalidate on write
   - Invalidate on remove

3. **Large Data**
   - Split into chunks
   - Reassemble on read
   - Handle templates > 8KB

---

## Component: Side Panel UI

### Scenarios

| Scenario | Description | Status |
|----------|-------------|--------|
| Template list display | Show templates, empty state | ✅ |
| Template creation flow | Open modal, validate, create | ✅ |
| Template execution flow | Input fields, process, show result | ✅ |
| Search functionality | Filter as user types, debounce | ✅ |
| Section navigation | Switch templates/history | ✅ |
| History display | Show entries with status badges | ✅ |
| Settings navigation | Open settings page | ✅ |
| Error handling | Show toasts, error states | ✅ |

### Key Test Cases

1. **Template Execution**
   - Generate input fields from template
   - Validate required inputs
   - Display result or error

2. **Navigation**
   - Switch active section
   - Update tab styling
   - Persist state

---

## Component: Background Service Worker

### Scenarios

| Scenario | Description | Status |
|----------|-------------|--------|
| Extension installation | Initial setup, welcome notification | ✅ |
| Extension update | Version migration, data migration | ✅ |
| Message handling | Handle known actions, validate sender | ✅ |
| Context menu management | Create, update, handle clicks | ✅ |
| Side panel integration | Configure behavior, open panel | ✅ |
| Tab management | Clean up on close, send messages | ✅ |
| Badge management | Processing, complete, error states | ✅ |
| Storage validation | Validate on startup, repair corruption | ✅ |

### Key Test Cases

1. **Message Handling**
   - Validate sender is extension
   - Route to correct handler
   - Return appropriate response

2. **Context Menus**
   - Create parent menu
   - Add template items
   - Handle clicks

---

## End-to-End Workflows

### Complete Template Workflow
1. Initialize services
2. Create template
3. Verify persistence
4. Execute template
5. Record history
6. Verify history

### Settings Configuration Workflow
1. Start with defaults
2. Configure provider
3. Persist settings
4. Verify across sessions

### Error Recovery Workflow
1. Handle failed execution
2. Record failure
3. Retry successfully
4. Update history

### Multi-session Persistence
1. Create data in session 1
2. Verify in session 2
3. Modify in session 2
4. Verify changes persist

### Concurrent Operations
1. Create templates concurrently
2. Add history concurrently
3. Verify all persisted

---

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

| Metric | Target |
|--------|--------|
| Branches | 70% |
| Functions | 70% |
| Lines | 70% |
| Statements | 70% |

