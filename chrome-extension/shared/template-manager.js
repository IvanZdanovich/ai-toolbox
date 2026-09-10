import storage from './storage.js';
import {
  generateId,
  validateTemplate,
  extractVariables,
  variableLabel,
  variablePlaceholder,
} from './helpers.js';
import { LIMITS, EVENTS, EXTENSION_VERSION } from './constants.js';

// Builds the input descriptors for a prompt's variables, preferring any
// caller-supplied input metadata over the generated defaults.
function buildInputs(prompt, customInputs) {
  if (customInputs && Array.isArray(customInputs)) {
    return customInputs.map((input) => ({
      name: input.name,
      label: input.label || variableLabel(input.name),
      placeholder: input.placeholder || variablePlaceholder(input.name),
      defaultValue: input.defaultValue || '',
    }));
  }

  return extractVariables(prompt).map((variable) => ({
    name: variable,
    label: variableLabel(variable),
    placeholder: variablePlaceholder(variable),
  }));
}

// Appends a suffix, trimming the base name first so the result still fits
// within MAX_TEMPLATE_NAME_LENGTH and passes validation.
function suffixName(name, suffix) {
  const max = LIMITS.MAX_TEMPLATE_NAME_LENGTH;
  if (name.length + suffix.length <= max) {
    return name + suffix;
  }
  return name.slice(0, Math.max(0, max - suffix.length)).trim() + suffix;
}

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

    // Only seed if this is truly the first time (no templates and not seeded before).
    // Record the flag either way, so emptying the list later can't re-seed.
    if (this.templates.length > 0) {
      await storage.setTemplatesSeeded(true);
      return;
    }

    const defaultTemplates = [
      // === SOCIAL MEDIA & CONTENT ===
      {
        id: generateId(),
        name: 'Social Media Post',
        description: 'Create engaging social media posts for any platform',
        prompt: `Write a {platform} post about: {topic}

Tone: {tone}

Open with a hook in the first line — a claim, question, or number, not a
generic greeting. Follow platform conventions for {platform} specifically:
character/length limit, whether hashtags belong inline or at the end, and
how many (if any) fit the platform's norms. Include a call-to-action only if
one makes sense for this topic — do not force one in.

Write only the finished post, ready to paste and publish. No title, no
"Option 1/2", no explanation of the choices you made.`,
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
        prompt: `Write a {sheet_type} formula for this task: {goal}

Data layout: {data_structure}

Give:
1. **Formula** — the exact, copy-paste-ready formula referencing the actual
   columns/ranges described above (not generic placeholders like "range").
2. **How it works** — walk through each function call in the formula, in
   the order it evaluates, in one sentence each.
3. **Worked example** — 3-4 rows of sample data matching the described
   layout, plus the value the formula returns on that data.
4. **Gotchas** — only things that actually apply here: e.g. this formula
   breaks if the sheet_type is the other one, requires a non-default array
   setting, or is sensitive to blank cells in the range. Skip this section
   if nothing applies.

Do not suggest an alternate approach unless the direct formula is genuinely
impractical.`,
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
            placeholder:
              'e.g., Column A: Category, Column B: Amount, Column C: Date',
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
        prompt: `Triage and rewrite this draft email:

{draft_email}

Context: {context}

Give:
1. **Priority** — Urgent / High / Medium / Low, with one sentence citing
   what in the email or context drives that (a deadline, a blocker, who's
   waiting on it). If nothing signals urgency, say Medium and say why.
2. **What this email is actually asking the reader to do** — one line. If
   the draft doesn't make that clear yet, note it here so the rewrite fixes
   it.
3. **Rewrite** — same intent, tightened: cut hedging and filler, put the
   ask in the first two sentences, fix tone mismatches for {context}. Keep
   every fact and commitment from the original; don't add ones that aren't
   there.
4. **Subject line** — only if the original had none or a weak one.

Skip sections that don't apply rather than padding them.`,
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
            placeholder:
              'e.g., responding to client request, internal update, follow-up',
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
        prompt: `Write a reply to this message:

{original_message}

Points I need to make: {key_points}

Tone: {tone}

Address every question or request in the original message — don't skip one
because it's inconvenient. Work in each of my key points where it's
relevant to what they asked; don't tack them on as an unrelated list.
Match the greeting/closing style already used in the original message if
one is visible there, otherwise pick one appropriate for {tone}.

Output only the reply text, ready to send. No subject line, no brackets,
no notes about what you did.`,
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
        prompt: `Turn this rough bug title into a ticket a developer can pick up
without asking clarifying questions: "{title_draft}"

Environment: {environment}

**Title:** a specific, searchable rewrite of the draft — name the
component/screen and the failure, not just the symptom (e.g. "Login button
unresponsive on iOS Safari after password autofill", not "login broken").

**Priority:** Critical/High/Medium/Low, with the one-sentence reason (data
loss and no workaround → Critical; cosmetic and rare → Low).

**Steps to reproduce:** write the concrete sequence implied by the title
and environment. Where the title doesn't specify a detail (which button,
which page state), write your best specific guess and mark it
"(assumed)" rather than leaving a vague step — a wrong assumption is easier
to correct than a placeholder.

**Expected vs. actual:** one line each, contrasting directly.

**Likely cause:** only include this if the title/environment make one
plausible (e.g. "autofill event probably fires after the handler binds");
omit the section entirely if you'd be guessing blind.

**Labels:** bug, {environment}, plus one label for the affected area if
it's identifiable from the title.

Do not include an acceptance-criteria checklist — that belongs to
whoever picks up the fix, not the ticket author.`,
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
        prompt: `Turn this rough feature title into a user story a developer can
estimate and start on: "{title_draft}"

Project: {project_context}

**User story:**
As a [the actual user role for this feature, not "user"]
I want to [the specific action, matching the title]
So that [the concrete benefit — infer it from the title; if genuinely
unclear, name the most plausible benefit and flag it as an assumption]

**Acceptance criteria:** 3-6 criteria, each testable by someone who didn't
write it. Cover the happy path, the one or two edge cases that actually
apply to a {project_context} of this kind (empty state, permission
denied, offline — whichever are relevant), and any UI states implied by
the title. Do not pad the list with generic boilerplate items.

**Open questions:** anything the title leaves ambiguous that would change
the implementation (e.g. scope, which roles can access it). Omit this
section if there's nothing to ask.

**Estimate:** a single story-point guess (1/2/3/5/8/13) with the one factor
driving it (new UI, backend change, third-party integration, etc.).

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
        description:
          'Break down big goals into actionable milestones and tasks',
        prompt: `Break this goal down into a plan someone could start executing
today:

Goal: {goal}
Timeline: {timeline}
Starting point: {current_state}

## Milestones
As many milestones as the goal actually needs to reach {timeline} from
{current_state} — don't force a fixed count. For each: a dated target
(work backward from {timeline}), what "done" looks like concretely, and
how you'd verify it's done (a number, a shipped thing, a passed test —
not "progress made").

## Next two weeks
3-5 tasks that move the first milestone forward, each phrased as a single
action a person could do this week, not a restatement of the milestone.

## Biggest risk
The one or two things most likely to blow up this timeline given
{current_state} specifically — not generic risks like "lack of time."
For each, the concrete step that reduces it.

Skip a "resources needed" section unless the goal clearly requires
something the person doesn't already have (budget, a specific skill,
outside access) — don't invent generic resource lists.`,
        inputs: [
          {
            name: 'goal',
            label: 'Main Goal',
            placeholder:
              'e.g., launch a SaaS product, learn machine learning, get promoted',
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
        description:
          'Translate text with cultural and contextual understanding',
        prompt: `Translate this from {from_language} to {to_language}:

{text}

Context it will be used in: {context}

Give:
1. **Literal translation** — accurate, unpolished, so meaning can be
   checked against the source.
2. **Natural translation** — how a native {to_language} speaker would
   actually write this for {context}. If it's identical to the literal
   version, say so instead of repeating the text.
3. **What changed and why** — only the adaptations that matter (register,
   an idiom that doesn't carry over, a term with no direct equivalent).
   Skip this section if the literal and natural versions matched.

Use the natural translation as the version to use unless the differences
section says otherwise.`,
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
            placeholder:
              'e.g., business email, marketing copy, casual conversation',
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
        prompt: `Find the idioms and culture-specific expressions in this text and
replace them for a {target_culture} audience:

{text}

Source culture: {source_culture}
Context: {context}

For each idiom found, give one table row: the original phrase, its literal
meaning, and the {target_culture} equivalent (an actual idiom there, not a
literal translation) — or "no equivalent, translate literally" if none
exists and forcing one would sound stranger than plain language.

If the text has no idioms or culture-bound expressions to localize, say so
plainly instead of inventing table rows.

Then give the full text with only those replacements made — everything
else stays as close to the original as possible.`,
        inputs: [
          {
            name: 'text',
            label: 'Text with Idioms',
            placeholder:
              'Enter text containing idioms or cultural expressions...',
            defaultValue: '',
          },
          {
            name: 'source_culture',
            label: 'Source Culture',
            placeholder:
              'e.g., American English, British English, Spanish (Spain)',
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

      // === META: TEMPLATE AUTHORING ===
      {
        id: generateId(),
        name: 'Template Builder',
        description:
          'Design a new toolbox template (prompt + variables) for a specific task, following this app\'s template rules',
        prompt: `Design a new template for this toolbox: {task_description}

Ground it in this scenario: {example_scenario}

Placeholder syntax is shown above: lower_snake_case in one pair of curly
braces, substituted verbatim at run time.

# Reasoning Principles
VARIABLE_MINIMALISM: only placeholders the output changes based on — otherwise a field goes unused
VARIABLE_NAMING: lower_snake_case, 1-3 words, names the value held — otherwise the auto-label reads oddly
NO_BRACKET_FILL: no square brackets in the prompt body, describe output in prose — otherwise the model echoes brackets literally
ADAPTIVE_STRUCTURE: list counts scale to the actual input, never a fixed number — otherwise output pads with filler
SKIP_CLAUSE: optional sections state the exact condition for omitting them — otherwise they get padded in anyway
GROUNDED_INFERENCE: missing details get a specific flagged guess, never a vague placeholder — otherwise output stalls
NO_METACOMMENTARY: artifact prompts (post, message, ticket) end with "output only the artifact" — otherwise preamble leaks in
CONCRETE_OVER_GENERIC: swap generic adjectives for the specific test this case must pass — otherwise output is boilerplate

# Output Shape
FIELD_NAME: noun phrase, under 50 chars, no "Template" suffix
FIELD_DESCRIPTION: one sentence, under 200 chars, naming what it produces
FIELD_PROMPT: markdown, under 2000 chars, placeholder-wraps each user value, follows every principle
FIELD_INPUTS: one entry per placeholder, no more/fewer — label is human-readable, placeholder is an example value not an instruction, defaultValue empty unless useful
DELIVERY: one fenced json block, keys name/description/prompt/inputs only

# Validation
VARIABLE_PARITY_CHECK: every placeholder has exactly one inputs entry and vice versa
LENGTH_CHECK: name/description/prompt each under their limits above
BRACKET_CHECK: prompt has no square-bracket placeholders
SPECIFICITY_CHECK: reread against a messy real instance of {task_description} — nothing is left to invent`,
        inputs: [
          {
            name: 'task_description',
            label: 'What should this template do?',
            placeholder:
              'e.g., turn a customer complaint into a support response',
            defaultValue: '',
          },
          {
            name: 'example_scenario',
            label: 'A concrete example to design around',
            placeholder:
              'e.g., a customer says their order arrived damaged and wants a refund',
            defaultValue: '',
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

    const template = {
      id: generateId(),
      name: templateData.name.trim(),
      description: templateData.description?.trim() || '',
      prompt: templateData.prompt.trim(),
      inputs: buildInputs(templateData.prompt, templateData.inputs),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.templates.push(template);
    if (!(await storage.setTemplates(this.templates))) {
      this.templates.pop();
      throw new Error('Failed to save template — storage quota may be full');
    }

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
      updatedTemplate.inputs = buildInputs(
        updatedTemplate.prompt,
        updates.inputs
      );
    }

    const previous = this.templates[index];
    this.templates[index] = updatedTemplate;
    if (!(await storage.setTemplates(this.templates))) {
      this.templates[index] = previous;
      throw new Error('Failed to save template — storage quota may be full');
    }

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
    if (!(await storage.setTemplates(this.templates))) {
      this.templates.splice(index, 0, deletedTemplate);
      throw new Error('Failed to delete template — storage write failed');
    }

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
      name: suffixName(original.name, ' (Copy)'),
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
      version: EXTENSION_VERSION,
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
          templateData.name = suffixName(templateData.name, ' (Imported)');
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
