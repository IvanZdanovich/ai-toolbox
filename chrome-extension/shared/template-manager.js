import storage from './storage.js';
import { generateId, validateTemplate, extractVariables } from './helpers.js';
import { LIMITS, EVENTS } from './constants.js';

class TemplateManager {
  constructor() {
    this.templates = [];
    this.listeners = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    try {
      this.templates = await storage.getTemplates();
      await this.seedDefaultTemplates();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TemplateManager:', error);
    }
  }

  async seedDefaultTemplates() {
    // Check if default templates have already been seeded
    const alreadySeeded = await storage.getTemplatesSeeded();
    if (alreadySeeded) {
      return;
    }

    // Only seed if this is truly the first time (no templates and not seeded before)
    if (this.templates.length > 0) {
      return;
    }

    const defaultTemplates = [
      // === SOCIAL MEDIA & CONTENT ===
      {
        id: generateId(),
        name: 'Social Media Post',
        description: 'Create engaging social media posts for any platform',
        prompt: `Create a social media post based on:

**Topic/Message:** {topic}

**Platform:** {platform}

**Tone:** {tone}

Create an engaging post that:
- Captures attention with a strong hook
- Delivers the message clearly and concisely
- Includes a call-to-action if appropriate
- Uses platform best practices (hashtags for Instagram/Twitter, professional tone for LinkedIn)
- Stays within platform character limits

Format the post ready to publish (no meta-commentary).`,
        inputs: [
          {
            name: 'topic',
            label: 'Topic/Message',
            placeholder: 'What do you want to share?',
            defaultValue: '',
          },
          {
            name: 'platform',
            label: 'Platform',
            placeholder: 'e.g., Twitter/X, LinkedIn, Instagram, Facebook',
            defaultValue: 'LinkedIn',
          },
          {
            name: 'tone',
            label: 'Tone',
            placeholder: 'e.g., professional, casual, inspirational, humorous',
            defaultValue: 'professional',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // === PRODUCTIVITY & DATA ===
      {
        id: generateId(),
        name: 'Excel Formula Helper',
        description: 'Generate Excel/Google Sheets formulas from plain English',
        prompt: `Generate an Excel/Google Sheets formula for this task:

**What I Need:** {goal}

**Data Structure:** {data_structure}

**Sheet Type:** {sheet_type}

Provide:
1. **Formula:** The exact formula to use
2. **Explanation:** Step-by-step breakdown of how it works
3. **Example:** A concrete example with sample data
4. **Notes:** Any important considerations or limitations
5. **Alternatives:** Other approaches if applicable

Make the formula copy-paste ready.`,
        inputs: [
          {
            name: 'goal',
            label: 'What You Need',
            placeholder: 'e.g., sum values where column A contains "Sales"',
            defaultValue: '',
          },
          {
            name: 'data_structure',
            label: 'Data Structure',
            placeholder: 'e.g., Column A: Category, Column B: Amount, Column C: Date',
            defaultValue: '',
          },
          {
            name: 'sheet_type',
            label: 'Sheet Type',
            placeholder: 'Excel or Google Sheets',
            defaultValue: 'Google Sheets',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // === EMAIL & COMMUNICATION ===
      {
        id: generateId(),
        name: 'Email Triage & Enhancement',
        description: 'Analyze, prioritize, and improve draft emails',
        prompt: `Analyze and enhance this email:

**Draft Email:**
{draft_email}

**Context:** {context}

Provide:
1. **Priority Assessment:** [Urgent/High/Medium/Low] with reasoning
2. **Key Action Items:** What needs to be done
3. **Enhanced Version:** Improved draft that is:
   - Clear and concise
   - Properly structured
   - Professional and polished
   - Action-oriented where appropriate
4. **Suggested Subject Line:** If not provided
5. **Recommendations:** Any additional improvements

Format the enhanced email ready to send.`,
        inputs: [
          {
            name: 'draft_email',
            label: 'Draft Email',
            placeholder: 'Paste your rough email draft...',
            defaultValue: '',
          },
          {
            name: 'context',
            label: 'Context',
            placeholder: 'e.g., responding to client request, internal update, follow-up',
            defaultValue: 'business email',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Email/Message Response',
        description: 'Generate complete responses to emails or messages',
        prompt: `Write a complete response based on:

**Original Message:**
{original_message}

**Your Key Points:**
{key_points}

**Tone:** {tone}

Create a polished response that:
- Addresses all points from the original message
- Incorporates your key points naturally
- Maintains the specified tone
- Is clear, professional, and well-structured
- Includes appropriate greeting and closing

Format the response ready to send (no meta-commentary).`,
        inputs: [
          {
            name: 'original_message',
            label: 'Original Message',
            placeholder: 'Paste the message you are responding to...',
            defaultValue: '',
          },
          {
            name: 'key_points',
            label: 'Your Key Points',
            placeholder: 'Main points you want to address or include...',
            defaultValue: '',
          },
          {
            name: 'tone',
            label: 'Tone',
            placeholder: 'e.g., professional, friendly, apologetic, firm',
            defaultValue: 'professional',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // === TICKET & TASK MANAGEMENT ===
      {
        id: generateId(),
        name: 'Bug Ticket from Title',
        description: 'Create detailed bug tickets from brief title drafts',
        prompt: `Create a detailed bug ticket from this title: "{title_draft}"

**Environment:** {environment}

Format as:
**Title:** [Clear, specific bug title]

**Type:** Bug

**Priority:** [Critical/High/Medium/Low]

**Description:**
[2-3 sentences describing the bug and its impact]

**Environment:**
- {environment}
- [Additional relevant environment details]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Observe the issue]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Impact:**
[How this affects users/system]

**Possible Cause:**
[Technical hypothesis if obvious from the title]

**Acceptance Criteria:**
- [ ] Bug is reproducible
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Tests added
- [ ] No regression in related features

**Labels:** bug, {environment}`,
        inputs: [
          {
            name: 'title_draft',
            label: 'Bug Title Draft',
            placeholder: 'e.g., login button not working on mobile',
            defaultValue: '',
          },
          {
            name: 'environment',
            label: 'Environment (optional)',
            placeholder: 'e.g., Chrome 131, iOS 18, production',
            defaultValue: 'Chrome 131, macOS',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Story Ticket from Title',
        description: 'Create user story tickets from brief title drafts',
        prompt: `Create a user story ticket from this title: "{title_draft}"

**Project Context:** {project_context}

Format as:
**Title:** [Clear, user-focused story title]

**Type:** Story

**User Story:**
As a [user type]
I want to [action/feature]
So that [benefit/value]

**Description:**
[2-3 sentences providing context and background]

**Acceptance Criteria:**
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]
- [ ] [UI/UX criterion if applicable]
- [ ] [Edge case handling]

**Technical Notes:**
- [Implementation approach suggestions]
- [Dependencies or prerequisites]
- [Potential challenges]

**Design Notes:**
[UI/UX considerations if applicable]

**Definition of Done:**
- [ ] Code implemented and reviewed
- [ ] Unit tests written
- [ ] Integration tested
- [ ] Documentation updated
- [ ] Stakeholder approved

**Priority:** [High/Medium/Low]
**Story Points:** [1/2/3/5/8/13]

**Labels:** feature, {project_context}`,
        inputs: [
          {
            name: 'title_draft',
            label: 'Story Title Draft',
            placeholder: 'e.g., add dark mode to settings page',
            defaultValue: '',
          },
          {
            name: 'project_context',
            label: 'Project Context (optional)',
            placeholder: 'e.g., React web app, mobile app, API service',
            defaultValue: 'web application',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // === PLANNING & STRATEGY ===
      {
        id: generateId(),
        name: 'Goal Breakdown',
        description: 'Break down big goals into actionable milestones and tasks',
        prompt: `Break down this goal into actionable steps:

**Main Goal:** {goal}

**Timeline:** {timeline}

**Current State:** {current_state}

Provide:
## Goal Overview
[1-2 sentence summary of the goal]

## Key Milestones
1. **Milestone 1** ([timeframe])
   - [What will be achieved]

2. **Milestone 2** ([timeframe])
   - [What will be achieved]

3. **Milestone 3** ([timeframe])
   - [What will be achieved]

## Immediate Next Steps (Week 1-2)
- [ ] [Specific actionable task 1]
- [ ] [Specific actionable task 2]
- [ ] [Specific actionable task 3]

## Success Metrics
- [How to measure milestone 1]
- [How to measure milestone 2]
- [How to measure final goal]

## Potential Obstacles
- [Challenge 1] → [Mitigation strategy]
- [Challenge 2] → [Mitigation strategy]

## Resources Needed
- [Resource/tool/skill 1]
- [Resource/tool/skill 2]

## Timeline Summary
- **Start:** [Date based on current state]
- **Milestone 1:** [Date]
- **Milestone 2:** [Date]
- **Target Completion:** {timeline}`,
        inputs: [
          {
            name: 'goal',
            label: 'Main Goal',
            placeholder: 'e.g., launch a SaaS product, learn machine learning, get promoted',
            defaultValue: '',
          },
          {
            name: 'timeline',
            label: 'Timeline',
            placeholder: 'e.g., 6 months, by Q2 2026, 1 year',
            defaultValue: '6 months',
          },
          {
            name: 'current_state',
            label: 'Current State',
            placeholder: 'e.g., have an idea, completed research, built MVP',
            defaultValue: 'starting from scratch',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // === LANGUAGE & TRANSLATION ===
      {
        id: generateId(),
        name: 'Context-Aware Translation',
        description: 'Translate text with cultural and contextual understanding',
        prompt: `Translate this text with cultural context:

**Text to Translate:**
{text}

**From:** {from_language}
**To:** {to_language}
**Context:** {context}

Provide:
1. **Direct Translation:**
[Accurate translation maintaining original meaning]

2. **Culturally Adapted Version:**
[Translation adjusted for target culture and context]

3. **Key Differences:**
- [Notable adaptation 1 and why]
- [Notable adaptation 2 and why]

4. **Tone & Formality:**
[How formality level was preserved or adjusted]

5. **Alternative Phrasings:**
- [Option 1]: [When to use this]
- [Option 2]: [When to use this]

**Recommended Version:** [Which translation to use based on context]`,
        inputs: [
          {
            name: 'text',
            label: 'Text to Translate',
            placeholder: 'Enter the text you want to translate...',
            defaultValue: '',
          },
          {
            name: 'from_language',
            label: 'From Language',
            placeholder: 'e.g., English, Spanish, Japanese',
            defaultValue: 'English',
          },
          {
            name: 'to_language',
            label: 'To Language',
            placeholder: 'e.g., French, German, Chinese',
            defaultValue: 'Spanish',
          },
          {
            name: 'context',
            label: 'Context',
            placeholder: 'e.g., business email, marketing copy, casual conversation',
            defaultValue: 'business email',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Idiom Localization',
        description: 'Replace idioms with culturally equivalent expressions',
        prompt: `Localize idioms in this text:

**Original Text:**
{text}

**Source Culture:** {source_culture}
**Target Culture:** {target_culture}
**Context:** {context}

Provide:
1. **Identified Idioms:**
[List idioms found in the text]

2. **Localized Version:**
[Full text with idioms replaced by culturally equivalent expressions]

3. **Idiom Mappings:**
| Original Idiom | Meaning | Target Equivalent | Why This Works |
|----------------|---------|-------------------|----------------|
| [idiom 1] | [meaning] | [replacement] | [cultural reasoning] |
| [idiom 2] | [meaning] | [replacement] | [cultural reasoning] |

4. **Alternative Approaches:**
- [If direct idiom replacement isn't ideal, suggest alternatives]

5. **Cultural Notes:**
[Any important cultural considerations for the target audience]

**Recommended Final Text:**
[The best localized version for the target culture and context]`,
        inputs: [
          {
            name: 'text',
            label: 'Text with Idioms',
            placeholder: 'Enter text containing idioms or cultural expressions...',
            defaultValue: '',
          },
          {
            name: 'source_culture',
            label: 'Source Culture',
            placeholder: 'e.g., American English, British English, Spanish (Spain)',
            defaultValue: 'American English',
          },
          {
            name: 'target_culture',
            label: 'Target Culture',
            placeholder: 'e.g., Japanese, German, Brazilian Portuguese',
            defaultValue: 'Spanish (Latin America)',
          },
          {
            name: 'context',
            label: 'Context',
            placeholder: 'e.g., marketing, business, literature, casual',
            defaultValue: 'business',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    this.templates = defaultTemplates;
    await storage.setTemplates(this.templates);
    await storage.setTemplatesSeeded(true);
  }

  async getAllTemplates() {
    if (!this.initialized) {
      await this.init();
    }
    return [...this.templates];
  }

  async getTemplate(id) {
    if (!this.initialized) {
      await this.init();
    }
    return this.templates.find((template) => template.id === id);
  }

  async createTemplate(templateData) {
    if (!this.initialized) {
      await this.init();
    }

    const errors = validateTemplate(templateData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    if (this.templates.length >= LIMITS.MAX_TEMPLATES) {
      throw new Error(
        `Maximum number of templates (${LIMITS.MAX_TEMPLATES}) reached`
      );
    }

    const variables = extractVariables(templateData.prompt);

    const template = {
      id: generateId(),
      name: templateData.name.trim(),
      description: templateData.description?.trim() || '',
      prompt: templateData.prompt.trim(),
      inputs: variables.map((variable) => ({
        name: variable,
        label: variable
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        placeholder: `Enter ${variable.replace(/_/g, ' ')}...`,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (templateData.inputs && Array.isArray(templateData.inputs)) {
      template.inputs = templateData.inputs.map((input) => ({
        name: input.name,
        label:
          input.label ||
          input.name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase()),
        placeholder:
          input.placeholder || `Enter ${input.name.replace(/_/g, ' ')}...`,
        defaultValue: input.defaultValue || '',
      }));
    }

    this.templates.push(template);
    await storage.setTemplates(this.templates);

    this.emit(EVENTS.TEMPLATE_CREATED, template);
    return template;
  }

  async updateTemplate(id, updates) {
    if (!this.initialized) {
      await this.init();
    }

    const index = this.templates.findIndex((template) => template.id === id);
    if (index === -1) {
      throw new Error('Template not found');
    }

    const updatedTemplate = {
      ...this.templates[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const errors = validateTemplate(updatedTemplate);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    if (updatedTemplate.prompt !== this.templates[index].prompt) {
      const variables = extractVariables(updatedTemplate.prompt);
      updatedTemplate.inputs = variables.map((variable) => ({
        name: variable,
        label: variable
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        placeholder: `Enter ${variable.replace(/_/g, ' ')}...`,
      }));

      if (updates.inputs && Array.isArray(updates.inputs)) {
        updatedTemplate.inputs = updates.inputs.map((input) => ({
          name: input.name,
          label:
            input.label ||
            input.name
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase()),
          placeholder:
            input.placeholder || `Enter ${input.name.replace(/_/g, ' ')}...`,
          defaultValue: input.defaultValue || '',
        }));
      }
    }

    this.templates[index] = updatedTemplate;
    await storage.setTemplates(this.templates);

    this.emit(EVENTS.TEMPLATE_UPDATED, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id) {
    if (!this.initialized) {
      await this.init();
    }

    const index = this.templates.findIndex((template) => template.id === id);
    if (index === -1) {
      throw new Error('Template not found');
    }

    const deletedTemplate = this.templates.splice(index, 1)[0];
    await storage.setTemplates(this.templates);

    this.emit(EVENTS.TEMPLATE_DELETED, deletedTemplate);
    return deletedTemplate;
  }

  async duplicateTemplate(id) {
    if (!this.initialized) {
      await this.init();
    }

    const original = this.templates.find((template) => template.id === id);
    if (!original) {
      throw new Error('Template not found');
    }

    const duplicate = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await this.createTemplate(duplicate);
  }

  async exportTemplates() {
    if (!this.initialized) {
      await this.init();
    }

    return {
      templates: this.templates,
      exportedAt: new Date().toISOString(),
      version: '0.9.0',
    };
  }

  async importTemplates(data) {
    if (!this.initialized) {
      await this.init();
    }

    if (!data.templates || !Array.isArray(data.templates)) {
      throw new Error('Invalid import data format');
    }

    const importedTemplates = [];
    const errors = [];

    for (const templateData of data.templates) {
      try {
        const existingTemplate = this.templates.find(
          (t) => t.name === templateData.name
        );
        if (existingTemplate) {
          templateData.name = `${templateData.name} (Imported)`;
        }

        const template = await this.createTemplate(templateData);
        importedTemplates.push(template);
      } catch (error) {
        errors.push(
          `Failed to import "${templateData.name}": ${error.message}`
        );
      }
    }

    return {
      imported: importedTemplates,
      errors,
    };
  }

  async searchTemplates(query) {
    if (!this.initialized) {
      await this.init();
    }

    if (!query || query.trim().length === 0) {
      return this.templates;
    }

    const searchTerm = query.toLowerCase().trim();

    return this.templates.filter(
      (template) =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm) ||
        template.prompt.toLowerCase().includes(searchTerm)
    );
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }

    const callbacks = this.listeners.get(event);
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

const templateManager = new TemplateManager();
export default templateManager;
