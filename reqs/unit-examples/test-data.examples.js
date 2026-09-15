/**
 * Test Fixtures
 * Predefined test data for integration tests
 */

export const fixtures = {
  // Sample templates
  templates: {
    email: {
      id: 'template-email-001',
      name: 'Email Response',
      description: 'Generate professional email responses',
      prompt:
        'Write a professional email response to: {email_content}. Tone: {tone}.',
      inputs: [
        {
          name: 'email_content',
          label: 'Email Content',
          placeholder: 'Paste email...',
        },
        { name: 'tone', label: 'Tone', placeholder: 'e.g., formal, friendly' },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },

    codeDoc: {
      id: 'template-code-002',
      name: 'Code Documentation',
      description: 'Generate documentation for code',
      prompt: 'Document this {language} code: {code}',
      inputs: [
        {
          name: 'language',
          label: 'Language',
          placeholder: 'JavaScript, Python...',
        },
        { name: 'code', label: 'Code', placeholder: 'Paste code...' },
      ],
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },

    summary: {
      id: 'template-summary-003',
      name: 'Text Summary',
      description: 'Summarize long text',
      prompt: 'Summarize this text in {length} words: {text}',
      inputs: [
        { name: 'text', label: 'Text', placeholder: 'Paste text...' },
        { name: 'length', label: 'Length', placeholder: '100' },
      ],
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
    },

    invalid: {
      id: 'template-invalid-004',
      name: '', // Invalid: empty name
      description: 'This template has validation errors',
      prompt: '', // Invalid: empty prompt
      inputs: [],
      createdAt: '2024-01-04T00:00:00.000Z',
      updatedAt: '2024-01-04T00:00:00.000Z',
    },
  },

  // Sample history entries
  history: {
    successfulExecution: {
      id: 'history-001',
      templateId: 'template-email-001',
      templateName: 'Email Response',
      inputs: {
        email_content: 'Hello, I need help with my order.',
        tone: 'friendly',
      },
      result: 'Dear Customer, Thank you for reaching out...',
      status: 'completed',
      timestamp: '2024-01-15T10:30:00.000Z',
      duration: 1500,
    },

    failedExecution: {
      id: 'history-002',
      templateId: 'template-code-002',
      templateName: 'Code Documentation',
      inputs: {
        language: 'JavaScript',
        code: 'function test() {}',
      },
      result: '',
      status: 'failed',
      error: 'API rate limit exceeded',
      timestamp: '2024-01-15T11:00:00.000Z',
      duration: 0,
    },

    processingExecution: {
      id: 'history-003',
      templateId: 'template-summary-003',
      templateName: 'Text Summary',
      inputs: {
        text: 'Long text to summarize...',
        length: '50',
      },
      result: '',
      status: 'processing',
      timestamp: '2024-01-15T12:00:00.000Z',
      duration: 0,
    },
  },

  // Sample settings configurations
  settings: {
    default: {
      apiKey: '',
      provider: 'mock',
      defaultProvider: 'mock',
      theme: 'auto',
    },

    withOpenAI: {
      apiKey: 'sk-test-key-12345',
      provider: 'openai',
      defaultProvider: 'openai',
      theme: 'light',
    },

    withClaude: {
      apiKey: 'sk-ant-test-key-12345',
      provider: 'claude',
      defaultProvider: 'claude',
      theme: 'dark',
    },
  },

  // Sample user inputs for template execution
  userInputs: {
    email: {
      email_content:
        'Hi, I received a damaged product and would like a refund.',
      tone: 'professional and empathetic',
    },

    codeDoc: {
      language: 'JavaScript',
      code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
    },

    summary: {
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
        20
      ),
      length: '50',
    },

    incomplete: {
      email_content: 'Some content',
      // Missing 'tone' field
    },

    empty: {},
  },

  // Expected AI responses
  aiResponses: {
    emailResponse: `Dear Valued Customer,

Thank you for bringing this to our attention. We sincerely apologize for the inconvenience caused by receiving a damaged product.

We would be happy to process a full refund for you. Please provide your order number and we will initiate the refund process immediately.

Best regards,
Customer Support Team`,

    codeDocResponse: `/**
 * Calculates the nth Fibonacci number recursively.
 * 
 * @param {number} n - The position in the Fibonacci sequence
 * @returns {number} The nth Fibonacci number
 * 
 * @example
 * fibonacci(5) // returns 5
 * fibonacci(10) // returns 55
 */`,

    summaryResponse: 'This is a summarized version of the provided text...',

    errorResponse: {
      message: 'API rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
};

/**
 * Factory functions to create test data
 */
export const factories = {
  /**
   * Create a template with custom overrides
   */
  createTemplate: (overrides = {}) => ({
    id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Template',
    description: 'A test template',
    prompt: 'Test prompt with {variable}',
    inputs: [
      { name: 'variable', label: 'Variable', placeholder: 'Enter value' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Create a history entry with custom overrides
   */
  createHistoryEntry: (overrides = {}) => ({
    id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    templateId: 'template-001',
    templateName: 'Test Template',
    inputs: { variable: 'test value' },
    result: 'Test result',
    status: 'completed',
    timestamp: new Date().toISOString(),
    duration: 1000,
    ...overrides,
  }),

  /**
   * Create settings with custom overrides
   */
  createSettings: (overrides = {}) => ({
    apiKey: '',
    provider: 'mock',
    defaultProvider: 'mock',
    theme: 'auto',
    ...overrides,
  }),

  /**
   * Create multiple templates
   */
  createTemplates: (count, baseOverrides = {}) => {
    return Array.from({ length: count }, (_, i) =>
      factories.createTemplate({
        name: `Template ${i + 1}`,
        description: `Description for template ${i + 1}`,
        ...baseOverrides,
      })
    );
  },

  /**
   * Create multiple history entries
   */
  createHistoryEntries: (count, baseOverrides = {}) => {
    return Array.from({ length: count }, (_, i) =>
      factories.createHistoryEntry({
        templateName: `Template ${i + 1}`,
        ...baseOverrides,
      })
    );
  },
};

export default fixtures;
