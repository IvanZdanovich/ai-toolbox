import { LIMITS } from './constants.js';

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleString();
}

export function formatRelativeTime(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  return formatDate(date);
}

export function validateTemplate(template) {
  const errors = [];
  
  if (!template.name || template.name.trim().length === 0) {
    errors.push('Template name is required');
  } else if (template.name.length > LIMITS.MAX_TEMPLATE_NAME_LENGTH) {
    errors.push(`Template name must be ${LIMITS.MAX_TEMPLATE_NAME_LENGTH} characters or less`);
  }
  
  if (template.description && template.description.length > LIMITS.MAX_TEMPLATE_DESCRIPTION_LENGTH) {
    errors.push(`Template description must be ${LIMITS.MAX_TEMPLATE_DESCRIPTION_LENGTH} characters or less`);
  }
  
  if (!template.prompt || template.prompt.trim().length === 0) {
    errors.push('Template prompt is required');
  } else if (template.prompt.length > LIMITS.MAX_TEMPLATE_PROMPT_LENGTH) {
    errors.push(`Template prompt must be ${LIMITS.MAX_TEMPLATE_PROMPT_LENGTH} characters or less`);
  }
  
  return errors;
}

export function extractVariables(prompt) {
  const variables = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  
  while ((match = regex.exec(prompt)) !== null) {
    const variable = match[1].trim();
    if (!variables.includes(variable)) {
      variables.push(variable);
    }
  }
  
  return variables;
}

export function replaceVariables(template, values) {
  let result = template;
  
  Object.entries(values).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\s*${key}\\s*\\}`, 'g');
    result = result.replace(regex, value || `{${key}}`);
  });
  
  return result;
}

export function sanitizeText(text) {
  if (typeof text !== 'string') {return '';}
  
  return text
    .replace(/[<>"'&]/g, (char) => {
      const entityMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;'
      };
      return entityMap[char];
    });
}

export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) {return text;}
  return text.substring(0, maxLength) + '...';
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  });
}

export function downloadAsJson(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

export function parseJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}