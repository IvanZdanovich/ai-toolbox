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
      // === TICKET & TASK MANAGEMENT ===
      {
        id: generateId(),
        name: 'Jira Ticket from Draft',
        description:
          'Create a well-structured Jira ticket from a brief title/idea',
        prompt: `Create a Jira ticket based on this draft title: "{draft_title}"

Project context: {project_context}

Format the response as:
**Title:** [Clear, actionable ticket title]

**Type:** [Bug/Story/Task/Improvement]

**Description:**
[2-3 sentences explaining the issue or feature]

**Acceptance Criteria:**
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

**Technical Notes:**
[Any implementation hints or considerations]

**Priority:** [Low/Medium/High/Critical]
**Story Points:** [1/2/3/5/8]`,
        inputs: [
          {
            name: 'draft_title',
            label: 'Draft Title/Idea',
            placeholder: 'e.g., fix login button not working on mobile',
          },
          {
            name: 'project_context',
            label: 'Project Context (optional)',
            placeholder: 'e.g., React web app, e-commerce platform',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Bug Report',
        description: 'Generate a detailed bug report from symptoms',
        prompt: `Create a detailed bug report based on these symptoms: "{symptoms}"

Environment: {environment}

Format as:
**Bug Title:** [Concise description]

**Environment:**
- Browser/Device: {environment}
- Version: [If known]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [Continue as needed]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Severity:** [Critical/Major/Minor/Trivial]

**Possible Cause:**
[Technical hypothesis if applicable]

**Screenshots/Logs:**
[Placeholder for attachments]`,
        inputs: [
          {
            name: 'symptoms',
            label: 'Bug Symptoms',
            placeholder: 'Describe what went wrong...',
          },
          {
            name: 'environment',
            label: 'Environment',
            placeholder: 'e.g., Chrome 120, Windows 11, iPhone 15',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // === LANGUAGE & COMMUNICATION ===
      {
        id: generateId(),
        name: 'Foreign Phrase Explanation',
        description:
          'Get detailed explanation of complex phrases in a foreign language',
        prompt: `Explain this {language} phrase in detail: "{phrase}"

Provide the explanation in {native_language} with the following format:

**Phrase:** {phrase}

**Literal Translation:**
[Word-by-word translation]

**Meaning:**
[What it actually means in context]

**Usage Context:**
[When and how to use this phrase - formal/informal, situations]

**Example Sentences:**
1. [Original language example] → [Translation]
2. [Original language example] → [Translation]

**Similar Expressions:**
- [Alternative phrase 1] - [meaning]
- [Alternative phrase 2] - [meaning]

**Common Mistakes:**
[What learners often get wrong with this phrase]

**Cultural Note:**
[Any cultural context that helps understand the phrase]`,
        inputs: [
          {
            name: 'phrase',
            label: 'Phrase to Explain',
            placeholder: 'Enter the foreign phrase...',
          },
          {
            name: 'language',
            label: 'Source Language',
            placeholder: 'e.g., German, Japanese, Spanish',
          },
          {
            name: 'native_language',
            label: 'Explain In',
            placeholder: 'e.g., English',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Message Response Draft',
        description:
          'Create a full response from an original message and your draft ideas',
        prompt: `Write a complete response based on:

**Original Message:**
{original_message}

**My Draft/Key Points:**
{draft_response}

**Tone:** {tone}

Create a polished, complete response that:
- Addresses all points from the original message
- Incorporates my draft ideas naturally
- Maintains the specified tone
- Is clear and professional
- Includes appropriate greeting and closing

Format the response ready to send (no meta-commentary).`,
        inputs: [
          {
            name: 'original_message',
            label: 'Original Message',
            placeholder: 'Paste the message you are responding to...',
          },
          {
            name: 'draft_response',
            label: 'Your Draft/Key Points',
            placeholder:
              'Your rough ideas, bullet points, or partial response...',
          },
          {
            name: 'tone',
            label: 'Tone',
            placeholder: 'e.g., professional, friendly, apologetic, firm',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Email Reply',
        description: 'Generate professional email response',
        prompt: `Write a professional email response:

**Original Email:**
{email_content}

**Key Points to Address:**
{key_points}

**Tone:** {tone}

Format as a ready-to-send email with:
- Appropriate greeting
- Clear, organized response to each point
- Professional closing
- Signature placeholder [Your Name]`,
        inputs: [
          {
            name: 'email_content',
            label: 'Original Email',
            placeholder: "Paste the email you're responding to...",
          },
          {
            name: 'key_points',
            label: 'Key Points to Include',
            placeholder: 'Main points you want to address...',
          },
          {
            name: 'tone',
            label: 'Tone',
            placeholder: 'e.g., formal, friendly, apologetic',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // === DEVELOPMENT & TECHNICAL ===
      {
        id: generateId(),
        name: 'Code Documentation',
        description: 'Generate comprehensive code documentation',
        prompt: `Create documentation for this {language} code:

\`\`\`{language}
{code}
\`\`\`

Format as:
## Overview
[Brief description of what this code does]

## Parameters
| Name | Type | Description | Required |
|------|------|-------------|----------|
[Table of parameters]

## Returns
[What the function/method returns]

## Example Usage
\`\`\`{language}
[Practical example]
\`\`\`

## Notes
- [Important considerations]
- [Edge cases]
- [Performance notes if relevant]`,
        inputs: [
          {
            name: 'code',
            label: 'Code Snippet',
            placeholder: 'Paste your code here...',
          },
          {
            name: 'language',
            label: 'Programming Language',
            placeholder: 'e.g., JavaScript, Python, TypeScript',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Git Commit Message',
        description: 'Generate conventional commit message from changes',
        prompt: `Generate a conventional commit message for these changes:

**Changes Made:**
{changes}

**Context:** {context}

Format as:
\`\`\`
<type>(<scope>): <short description>

<detailed body explaining what and why>

<footer with issue references if applicable>
\`\`\`

Types: feat, fix, docs, style, refactor, test, chore
Keep the first line under 72 characters.`,
        inputs: [
          {
            name: 'changes',
            label: 'Changes Made',
            placeholder: 'Describe what you changed...',
          },
          {
            name: 'context',
            label: 'Context/Ticket (optional)',
            placeholder: 'e.g., JIRA-123, fixes login issue',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'PR Description',
        description: 'Generate pull request description from changes',
        prompt: `Create a pull request description:

**Title/Summary:** {title}
**Changes:** {changes}
**Ticket:** {ticket}

Format as:
## Summary
[2-3 sentence overview]

## Changes
- [Change 1]
- [Change 2]
- [Continue as needed]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] [Test case 1]
- [ ] [Test case 2]

## Screenshots (if applicable)
[Placeholder]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated

Closes {ticket}`,
        inputs: [
          {
            name: 'title',
            label: 'PR Title/Summary',
            placeholder: 'Brief description of the PR...',
          },
          {
            name: 'changes',
            label: 'Changes Made',
            placeholder: 'List the main changes...',
          },
          {
            name: 'ticket',
            label: 'Ticket Reference',
            placeholder: 'e.g., JIRA-123, #456',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // === MEETINGS & NOTES ===
      {
        id: generateId(),
        name: 'Meeting Summary',
        description: 'Convert meeting notes into structured summary',
        prompt: `Convert these meeting notes into a structured summary:

**Raw Notes:**
{meeting_notes}

**Meeting Type:** {meeting_type}

Format as:
# Meeting Summary
**Date:** [Today's date]
**Type:** {meeting_type}
**Attendees:** [Extract from notes or mark as TBD]

## Key Discussion Points
1. [Main topic 1]
2. [Main topic 2]
3. [Continue as needed]

## Decisions Made
- ✅ [Decision 1]
- ✅ [Decision 2]

## Action Items
| Task | Owner | Due Date |
|------|-------|----------|
| [Task 1] | [Person] | [Date] |
| [Task 2] | [Person] | [Date] |

## Next Steps
- [Immediate next step]
- [Follow-up items]

## Open Questions
- [Unresolved question 1]
- [Unresolved question 2]`,
        inputs: [
          {
            name: 'meeting_notes',
            label: 'Meeting Notes',
            placeholder: 'Paste your raw meeting notes...',
          },
          {
            name: 'meeting_type',
            label: 'Meeting Type',
            placeholder: 'e.g., Sprint Planning, 1:1, Team Sync, Client Call',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // === CONTENT & WRITING ===
      {
        id: generateId(),
        name: 'Text Rewrite',
        description: 'Rewrite text in a different style or tone',
        prompt: `Rewrite the following text:

**Original Text:**
{original_text}

**Target Style:** {style}
**Purpose:** {purpose}

Provide the rewritten version that:
- Maintains the core message
- Adapts to the specified style
- Is appropriate for the stated purpose
- Improves clarity where possible

Output only the rewritten text, ready to use.`,
        inputs: [
          {
            name: 'original_text',
            label: 'Original Text',
            placeholder: 'Paste text to rewrite...',
          },
          {
            name: 'style',
            label: 'Target Style',
            placeholder: 'e.g., formal, casual, concise, detailed, persuasive',
          },
          {
            name: 'purpose',
            label: 'Purpose',
            placeholder: 'e.g., blog post, email, documentation, social media',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "Explain Like I'm 5",
        description: 'Simplify complex concepts into easy explanations',
        prompt: `Explain this concept in simple terms:

**Concept:** {concept}

**Context/Field:** {context}

Provide:
1. **Simple Explanation** (2-3 sentences a child could understand)
2. **Analogy** (real-world comparison)
3. **Key Points** (3 bullet points)
4. **Common Misconceptions** (what people often get wrong)
5. **Learn More** (what to explore next)`,
        inputs: [
          {
            name: 'concept',
            label: 'Concept to Explain',
            placeholder: 'e.g., blockchain, machine learning, recursion',
          },
          {
            name: 'context',
            label: 'Field/Context',
            placeholder: 'e.g., computer science, finance, biology',
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
