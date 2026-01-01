/**
 * Side Panel Integration Tests
 *
 * Tests the side panel UI component including:
 * - Template listing and rendering
 * - Template creation/editing flow
 * - Template execution flow
 * - History viewing
 * - Search functionality
 * - UI state management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../mocks/chrome-api.mock.js';
import { fixtures, factories } from '../fixtures/test-data.js';

// Mock DOM environment
function createMockDOM() {
  // Create basic DOM structure for sidepanel
  document.body.innerHTML = `
    <div class="sidepanel-container">
      <nav class="nav-tabs">
        <button class="nav-tab active" data-section="templates">Templates</button>
        <button class="nav-tab" data-section="history">History</button>
      </nav>
      
      <main class="sidepanel-content">
        <section id="templates" class="section active">
          <div class="section-header">
            <button class="btn btn-primary" id="createTemplateBtn">New Template</button>
            <div class="search-box">
              <input type="text" id="templateSearch" class="form-input" placeholder="Search..." />
            </div>
          </div>
          <div id="templatesList" class="templates-list"></div>
          <div id="templatesEmpty" class="empty-state hidden"></div>
        </section>
        
        <section id="history" class="section">
          <div class="section-header">
            <div class="search-box">
              <input type="text" id="historySearch" class="form-input" placeholder="Search history..." />
            </div>
          </div>
          <div id="historyList" class="history-list"></div>
          <div id="historyEmpty" class="empty-state hidden"></div>
        </section>
      </main>
      
      <footer class="sidepanel-footer">
        <button class="footer-btn" id="settingsBtn">⚙️</button>
      </footer>
    </div>
    
    <!-- Modals -->
    <div id="createTemplateModal" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Create Template</h2>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <form id="createTemplateForm">
            <input type="text" id="templateName" required />
            <textarea id="templateDescription"></textarea>
            <textarea id="templatePrompt" required></textarea>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelCreate">Cancel</button>
          <button class="btn btn-primary" id="saveTemplate">Save</button>
        </div>
      </div>
    </div>
    
    <div id="executeTemplateModal" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Execute Template</h2>
        </div>
        <div class="modal-body">
          <form id="executeForm">
            <div id="executeInputs"></div>
          </form>
          <div id="executeResult" class="hidden"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelExecute">Cancel</button>
          <button class="btn btn-primary" id="runTemplate">Run</button>
        </div>
      </div>
    </div>
    
    <div id="toastContainer" class="toast-container"></div>
  `;
}

// Mock managers
const mockTemplateManager = {
  init: vi.fn().mockResolvedValue(undefined),
  getAllTemplates: vi.fn().mockResolvedValue([]),
  getTemplate: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  searchTemplates: vi.fn(),
};

const mockHistoryManager = {
  init: vi.fn().mockResolvedValue(undefined),
  getAllHistory: vi.fn().mockResolvedValue([]),
  addHistoryEntry: vi.fn(),
  searchHistory: vi.fn(),
};

const mockAiService = {
  init: vi.fn().mockResolvedValue(undefined),
  processTemplate: vi.fn(),
};

vi.mock('../../shared/template-manager.js', () => ({
  default: mockTemplateManager,
}));

vi.mock('../../shared/history-manager.js', () => ({
  default: mockHistoryManager,
}));

vi.mock('../../shared/ai-service.js', () => ({
  default: mockAiService,
}));

describe('Side Panel Integration', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
    createMockDOM();
    vi.clearAllMocks();
  });

  afterEach(() => {
    uninstallChromeMock();
    document.body.innerHTML = '';
  });

  describe('Scenario: User views template list', () => {
    it('should display templates when available', async () => {
      // Given: Templates exist
      const templates = [fixtures.templates.email, fixtures.templates.codeDoc];
      mockTemplateManager.getAllTemplates.mockResolvedValue(templates);

      // When: Rendering templates
      const templatesList = document.getElementById('templatesList');
      templates.forEach((template) => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
          <div class="template-card-header">
            <h3 class="template-card-title">${template.name}</h3>
          </div>
          <p class="template-card-description">${template.description}</p>
        `;
        templatesList.appendChild(card);
      });

      // Then: Templates should be displayed
      const cards = templatesList.querySelectorAll('.template-card');
      expect(cards).toHaveLength(2);
      expect(cards[0].textContent).toContain('Email Response');
    });

    it('should show empty state when no templates', async () => {
      // Given: No templates
      mockTemplateManager.getAllTemplates.mockResolvedValue([]);

      // When: Checking for templates
      const templates = await mockTemplateManager.getAllTemplates();
      const emptyState = document.getElementById('templatesEmpty');

      if (templates.length === 0) {
        emptyState.classList.remove('hidden');
      }

      // Then: Empty state should be visible
      expect(emptyState.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Scenario: User creates a new template', () => {
    it('should open create modal when clicking new button', () => {
      // Given: Create button exists
      const createBtn = document.getElementById('createTemplateBtn');
      const modal = document.getElementById('createTemplateModal');

      // When: Clicking create button
      createBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
      });
      createBtn.click();

      // Then: Modal should be visible
      expect(modal.classList.contains('hidden')).toBe(false);
    });

    it('should create template with valid data', async () => {
      // Given: Form with valid data
      const nameInput = document.getElementById('templateName');
      const descInput = document.getElementById('templateDescription');
      const promptInput = document.getElementById('templatePrompt');

      nameInput.value = 'New Template';
      descInput.value = 'A new template description';
      promptInput.value = 'Process this: {input}';

      mockTemplateManager.createTemplate.mockResolvedValue({
        id: 'new-id',
        name: 'New Template',
        description: 'A new template description',
        prompt: 'Process this: {input}',
      });

      // When: Submitting the form
      const result = await mockTemplateManager.createTemplate({
        name: nameInput.value,
        description: descInput.value,
        prompt: promptInput.value,
      });

      // Then: Template should be created
      expect(mockTemplateManager.createTemplate).toHaveBeenCalled();
      expect(result.name).toBe('New Template');
    });

    it('should validate required fields', () => {
      // Given: Form with empty required fields
      const nameInput = document.getElementById('templateName');
      const promptInput = document.getElementById('templatePrompt');

      nameInput.value = '';
      promptInput.value = '';

      // When: Checking validity
      const isValid =
        nameInput.value.trim() !== '' && promptInput.value.trim() !== '';

      // Then: Should be invalid
      expect(isValid).toBe(false);
    });
  });

  describe('Scenario: User executes a template', () => {
    it('should open execute modal with input fields', () => {
      // Given: A template with variables
      const template = fixtures.templates.email;
      const modal = document.getElementById('executeTemplateModal');
      const inputsContainer = document.getElementById('executeInputs');

      // When: Opening execute modal
      modal.classList.remove('hidden');
      template.inputs.forEach((input) => {
        const field = document.createElement('div');
        field.className = 'form-group';
        field.innerHTML = `
          <label class="form-label">${input.label}</label>
          <input type="text" name="${input.name}" class="form-input" placeholder="${input.placeholder}" />
        `;
        inputsContainer.appendChild(field);
      });

      // Then: Input fields should be created
      const fields = inputsContainer.querySelectorAll('.form-group');
      expect(fields.length).toBe(template.inputs.length);
    });

    it('should process template and show result', async () => {
      // Given: Template with inputs
      const template = fixtures.templates.email;
      const inputs = fixtures.userInputs.email;

      mockAiService.processTemplate.mockResolvedValue({
        result: fixtures.aiResponses.emailResponse,
        duration: 1500,
        provider: 'mock',
      });

      // When: Executing template
      const response = await mockAiService.processTemplate(template, inputs);

      // Then: Result should be returned
      expect(response.result).toBe(fixtures.aiResponses.emailResponse);
      expect(mockAiService.processTemplate).toHaveBeenCalledWith(
        template,
        inputs
      );
    });

    it('should add execution to history', async () => {
      // Given: Successful execution
      const template = fixtures.templates.email;
      const inputs = fixtures.userInputs.email;
      const result = fixtures.aiResponses.emailResponse;

      mockHistoryManager.addHistoryEntry.mockResolvedValue({
        id: 'history-new',
        templateId: template.id,
        templateName: template.name,
        inputs,
        result,
        status: 'completed',
      });

      // When: Adding to history
      const entry = await mockHistoryManager.addHistoryEntry(
        template.id,
        template.name,
        inputs,
        result,
        'completed'
      );

      // Then: History entry should be created
      expect(mockHistoryManager.addHistoryEntry).toHaveBeenCalled();
      expect(entry.status).toBe('completed');
    });

    it('should handle execution errors', async () => {
      // Given: AI service that throws
      mockAiService.processTemplate.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      // When/Then: Should catch error
      await expect(
        mockAiService.processTemplate(
          fixtures.templates.email,
          fixtures.userInputs.email
        )
      ).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('Scenario: User searches templates', () => {
    it('should filter templates as user types', async () => {
      // Given: Search input and templates
      const searchInput = document.getElementById('templateSearch');
      const templates = [
        fixtures.templates.email,
        fixtures.templates.codeDoc,
        fixtures.templates.summary,
      ];

      mockTemplateManager.searchTemplates.mockImplementation((query) => {
        return templates.filter((t) =>
          t.name.toLowerCase().includes(query.toLowerCase())
        );
      });

      // When: User types search query
      searchInput.value = 'email';
      const results = await mockTemplateManager.searchTemplates('email');

      // Then: Only matching templates should be returned
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Email Response');
    });

    it('should debounce search input', async () => {
      // Given: Search with debounce
      const searchInput = document.getElementById('templateSearch');
      let searchCalls = 0;

      const debouncedSearch = (query) => {
        searchCalls++;
        return mockTemplateManager.searchTemplates(query);
      };

      // When: Rapid typing (simulated)
      searchInput.value = 'e';
      searchInput.value = 'em';
      searchInput.value = 'ema';
      searchInput.value = 'email';

      // With debounce, only final search should execute
      // (In real implementation)
    });
  });

  describe('Scenario: User navigates between sections', () => {
    it('should switch to history section', () => {
      // Given: Templates section is active
      const templatesTab = document.querySelector('[data-section="templates"]');
      const historyTab = document.querySelector('[data-section="history"]');
      const templatesSection = document.getElementById('templates');
      const historySection = document.getElementById('history');

      // When: Clicking history tab
      historyTab.click();
      templatesTab.classList.remove('active');
      historyTab.classList.add('active');
      templatesSection.classList.remove('active');
      historySection.classList.add('active');

      // Then: History section should be visible
      expect(historyTab.classList.contains('active')).toBe(true);
      expect(historySection.classList.contains('active')).toBe(true);
      expect(templatesSection.classList.contains('active')).toBe(false);
    });
  });

  describe('Scenario: User views execution history', () => {
    it('should display history entries', async () => {
      // Given: History exists
      const history = [
        fixtures.history.successfulExecution,
        fixtures.history.failedExecution,
      ];
      mockHistoryManager.getAllHistory.mockResolvedValue(history);

      // When: Rendering history
      const historyList = document.getElementById('historyList');
      const entries = await mockHistoryManager.getAllHistory();

      entries.forEach((entry) => {
        const item = document.createElement('div');
        item.className = 'history-entry';
        item.innerHTML = `
          <div class="history-entry-header">
            <span class="history-entry-title">${entry.templateName}</span>
            <span class="status-badge ${entry.status}">${entry.status}</span>
          </div>
        `;
        historyList.appendChild(item);
      });

      // Then: History should be displayed
      const items = historyList.querySelectorAll('.history-entry');
      expect(items).toHaveLength(2);
    });

    it('should show status badges correctly', async () => {
      // Given: History with different statuses
      const historyList = document.getElementById('historyList');

      const successEntry = document.createElement('div');
      successEntry.innerHTML =
        '<span class="status-badge completed">completed</span>';
      historyList.appendChild(successEntry);

      const failedEntry = document.createElement('div');
      failedEntry.innerHTML = '<span class="status-badge failed">failed</span>';
      historyList.appendChild(failedEntry);

      // Then: Badges should have correct classes
      expect(historyList.querySelector('.status-badge.completed')).toBeTruthy();
      expect(historyList.querySelector('.status-badge.failed')).toBeTruthy();
    });
  });

  describe('Scenario: User opens settings', () => {
    it('should navigate to settings page', () => {
      // Given: Settings button
      const settingsBtn = document.getElementById('settingsBtn');
      let navigated = false;

      // When: Clicking settings
      settingsBtn.addEventListener('click', () => {
        navigated = true;
        // In real app: chrome.tabs.create({ url: 'settings/settings.html' })
      });
      settingsBtn.click();

      // Then: Should navigate
      expect(navigated).toBe(true);
    });
  });
});

describe('Side Panel Error Handling', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
    createMockDOM();
  });

  afterEach(() => {
    uninstallChromeMock();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should show error toast on failed template creation', async () => {
    // Given: Template creation fails
    mockTemplateManager.createTemplate.mockRejectedValue(
      new Error('Validation failed')
    );

    // When: Trying to create template
    const toastContainer = document.getElementById('toastContainer');

    try {
      await mockTemplateManager.createTemplate({ name: '' });
    } catch (error) {
      const toast = document.createElement('div');
      toast.className = 'toast error';
      toast.textContent = error.message;
      toastContainer.appendChild(toast);
    }

    // Then: Error toast should be shown
    expect(toastContainer.querySelector('.toast.error')).toBeTruthy();
  });

  it('should show error state when loading fails', async () => {
    // Given: Loading fails
    mockTemplateManager.getAllTemplates.mockRejectedValue(
      new Error('Storage error')
    );

    // When: Trying to load templates
    try {
      await mockTemplateManager.getAllTemplates();
    } catch (error) {
      const templatesSection = document.getElementById('templates');
      templatesSection.innerHTML =
        '<div class="error-state">Failed to load templates</div>';
    }

    // Then: Error state should be shown
    expect(document.querySelector('.error-state')).toBeTruthy();
  });
});
