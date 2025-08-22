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
    if (this.initialized) {return;}
    
    try {
      this.templates = await storage.getTemplates();
      await this.seedDefaultTemplates();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TemplateManager:', error);
    }
  }

  async seedDefaultTemplates() {
    if (this.templates.length > 0) {return;}
    
    const defaultTemplates = [
      {
        id: generateId(),
        name: 'Email',
        description: 'Generate professional email responses',
        prompt: 'Write a professional email response to the following message: {email_content}. The tone should be {tone} and include {key_points}.',
        inputs: [
          {
            name: 'email_content',
            label: 'Original Email Content',
            placeholder: 'Paste the email you\'re responding to...'
          },
          {
            name: 'tone',
            label: 'Response Tone',
            placeholder: 'e.g., friendly, formal, apologetic'
          },
          {
            name: 'key_points',
            label: 'Key Points to Address',
            placeholder: 'Main points you want to cover...'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: generateId(),
        name: 'Code Documentation',
        description: 'Generate documentation for code snippets',
        prompt: 'Create comprehensive documentation for this {language} code: {code}. Include purpose, parameters, return values, and usage examples.',
        inputs: [
          {
            name: 'language',
            label: 'Programming Language',
            placeholder: 'e.g., JavaScript, Python, Java'
          },
          {
            name: 'code',
            label: 'Code Snippet',
            placeholder: 'Paste your code here...'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: generateId(),
        name: 'Meeting Summary',
        description: 'Summarize meeting notes into key points',
        prompt: 'Summarize the following meeting notes into key points, action items, and decisions made: {meeting_notes}. Format as: Key Points, Action Items (with owners), and Decisions.',
        inputs: [
          {
            name: 'meeting_notes',
            label: 'Meeting Notes',
            placeholder: 'Paste your meeting notes here...'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    this.templates = defaultTemplates;
    await storage.setTemplates(this.templates);
  }

  async getAllTemplates() {
    if (!this.initialized) {await this.init();}
    return [...this.templates];
  }

  async getTemplate(id) {
    if (!this.initialized) {await this.init();}
    return this.templates.find(template => template.id === id);
  }

  async createTemplate(templateData) {
    if (!this.initialized) {await this.init();}
    
    const errors = validateTemplate(templateData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    if (this.templates.length >= LIMITS.MAX_TEMPLATES) {
      throw new Error(`Maximum number of templates (${LIMITS.MAX_TEMPLATES}) reached`);
    }
    
    const variables = extractVariables(templateData.prompt);
    
    const template = {
      id: generateId(),
      name: templateData.name.trim(),
      description: templateData.description?.trim() || '',
      prompt: templateData.prompt.trim(),
      inputs: variables.map(variable => ({
        name: variable,
        label: variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        placeholder: `Enter ${variable.replace(/_/g, ' ')}...`
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (templateData.inputs && Array.isArray(templateData.inputs)) {
      template.inputs = templateData.inputs.map(input => ({
        name: input.name,
        label: input.label || input.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        placeholder: input.placeholder || `Enter ${input.name.replace(/_/g, ' ')}...`
      }));
    }
    
    this.templates.push(template);
    await storage.setTemplates(this.templates);
    
    this.emit(EVENTS.TEMPLATE_CREATED, template);
    return template;
  }

  async updateTemplate(id, updates) {
    if (!this.initialized) {await this.init();}
    
    const index = this.templates.findIndex(template => template.id === id);
    if (index === -1) {
      throw new Error('Template not found');
    }
    
    const updatedTemplate = {
      ...this.templates[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    
    const errors = validateTemplate(updatedTemplate);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    if (updatedTemplate.prompt !== this.templates[index].prompt) {
      const variables = extractVariables(updatedTemplate.prompt);
      updatedTemplate.inputs = variables.map(variable => ({
        name: variable,
        label: variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        placeholder: `Enter ${variable.replace(/_/g, ' ')}...`
      }));
      
      if (updates.inputs && Array.isArray(updates.inputs)) {
        updatedTemplate.inputs = updates.inputs.map(input => ({
          name: input.name,
          label: input.label || input.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          placeholder: input.placeholder || `Enter ${input.name.replace(/_/g, ' ')}...`
        }));
      }
    }
    
    this.templates[index] = updatedTemplate;
    await storage.setTemplates(this.templates);
    
    this.emit(EVENTS.TEMPLATE_UPDATED, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id) {
    if (!this.initialized) {await this.init();}
    
    const index = this.templates.findIndex(template => template.id === id);
    if (index === -1) {
      throw new Error('Template not found');
    }
    
    const deletedTemplate = this.templates.splice(index, 1)[0];
    await storage.setTemplates(this.templates);
    
    this.emit(EVENTS.TEMPLATE_DELETED, deletedTemplate);
    return deletedTemplate;
  }

  async duplicateTemplate(id) {
    if (!this.initialized) {await this.init();}
    
    const original = this.templates.find(template => template.id === id);
    if (!original) {
      throw new Error('Template not found');
    }
    
    const duplicate = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return await this.createTemplate(duplicate);
  }

  async exportTemplates() {
    if (!this.initialized) {await this.init();}
    
    return {
      templates: this.templates,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  async importTemplates(data) {
    if (!this.initialized) {await this.init();}
    
    if (!data.templates || !Array.isArray(data.templates)) {
      throw new Error('Invalid import data format');
    }
    
    const importedTemplates = [];
    const errors = [];
    
    for (const templateData of data.templates) {
      try {
        const existingTemplate = this.templates.find(t => t.name === templateData.name);
        if (existingTemplate) {
          templateData.name = `${templateData.name} (Imported)`;
        }
        
        const template = await this.createTemplate(templateData);
        importedTemplates.push(template);
      } catch (error) {
        errors.push(`Failed to import "${templateData.name}": ${error.message}`);
      }
    }
    
    return {
      imported: importedTemplates,
      errors
    };
  }

  async searchTemplates(query) {
    if (!this.initialized) {await this.init();}
    
    if (!query || query.trim().length === 0) {
      return this.templates;
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    return this.templates.filter(template => 
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
    if (!this.listeners.has(event)) {return;}
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) {return;}
    
    const callbacks = this.listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

export default new TemplateManager();