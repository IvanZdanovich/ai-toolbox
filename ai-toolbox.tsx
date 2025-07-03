import React, { useState, useEffect } from 'react';
import { Plus, Play, Edit2, Trash2, Settings, History, Copy, Check } from 'lucide-react';

const AIToolbox = () => {
  const [templates, setTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [runHistory, setRunHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runningTemplateId, setRunningTemplateId] = useState(null);
  const [runInputs, setRunInputs] = useState({});
  const [runResult, setRunResult] = useState('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateDescription = async () => {
    if (!newTemplate.name.trim()) {
      alert('Please enter a template name first');
      return;
    }
    
    setIsGeneratingDescription(true);
    try {
      const prompt = `Generate a brief, professional description for an AI template with this name: "${newTemplate.name}". The description should be 1-2 sentences explaining what this template does. Return only the description text, no additional formatting.`;
      const response = await window.claude.complete(prompt);
      setNewTemplate({ ...newTemplate, description: response.trim() });
    } catch (error) {
      alert('Failed to generate description. Please try again.');
    }
    setIsGeneratingDescription(false);
  };

  const generatePrompt = async () => {
    if (!newTemplate.name.trim()) {
      alert('Please enter a template name first');
      return;
    }
    
    setIsGeneratingPrompt(true);
    try {
      const prompt = `Create a comprehensive AI prompt template for: "${newTemplate.name}". 
      
      The prompt should:
      1. Be professional and well-structured
      2. Include clear instructions for the AI
      3. Use {variableName} syntax for user inputs
      4. Include formatting instructions for the output
      5. Be ready to use for automating tasks
      
      Return only the prompt template text, no additional explanation.`;
      const response = await window.claude.complete(prompt);
      setNewTemplate({ ...newTemplate, prompt: response.trim() });
    } catch (error) {
      alert('Failed to generate prompt. Please try again.');
    }
    setIsGeneratingPrompt(false);
  };

  // Load templates from localStorage on component mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem('ai-toolbox-templates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      // Set default templates only if no saved templates exist
      const defaultTemplates = [
        {
          id: 1,
          name: "Ticket Refactor",
          description: "Transform messy ticket titles into clear, structured descriptions",
          prompt: `Please refactor this ticket information into a professional format:

Original Input: {input}

Please provide:
1. **Refined Title**: A clear, concise title following best practices
2. **Description**: Detailed description with context
3. **Acceptance Criteria**: List of specific requirements
4. **Priority Level**: Suggested priority (High/Medium/Low)
5. **Estimated Effort**: Rough time estimate
6. **Tags**: Relevant tags for categorization

Format the response in a clean, structured way.`,
          inputs: [
            { name: "input", label: "Original Ticket Info", type: "textarea", placeholder: "Paste your original ticket title/description here..." }
          ]
        },
        {
          id: 2,
          name: "Email Response Generator",
          description: "Generate professional email responses",
          prompt: `Generate a professional email response based on:

Incoming Email Context: {context}
Desired Tone: {tone}
Key Points to Address: {points}

Please create a well-structured, professional email response that addresses all key points while maintaining the requested tone.`,
          inputs: [
            { name: "context", label: "Email Context", type: "textarea", placeholder: "Describe the email you're responding to..." },
            { name: "tone", label: "Desired Tone", type: "select", options: ["Professional", "Friendly", "Formal", "Casual"] },
            { name: "points", label: "Key Points", type: "textarea", placeholder: "List the main points to address..." }
          ]
        },
        {
          id: 3,
          name: "Code Documentation",
          description: "Generate comprehensive code documentation",
          prompt: `Please generate comprehensive documentation for this code:

Code: {code}
Language: {language}

Please provide:
1. **Overview**: What this code does
2. **Parameters**: Description of inputs/parameters
3. **Return Value**: What it returns
4. **Usage Example**: How to use it
5. **Notes**: Any important considerations

Format as clean, professional documentation.`,
          inputs: [
            { name: "code", label: "Code", type: "textarea", placeholder: "Paste your code here..." },
            { name: "language", label: "Programming Language", type: "text", placeholder: "e.g., JavaScript, Python, etc." }
          ]
        },
        {
          id: 4,
          name: "Meeting Summary",
          description: "Convert meeting notes into structured summaries",
          prompt: `Please convert these meeting notes into a structured summary:

Meeting Notes: {notes}
Meeting Type: {type}

Please provide:
1. **Meeting Overview**: Brief summary of the meeting
2. **Key Decisions**: Important decisions made
3. **Action Items**: Tasks assigned with owners (if mentioned)
4. **Next Steps**: What happens next
5. **Follow-up Required**: Any follow-up actions needed

Format in a clear, professional structure.`,
          inputs: [
            { name: "notes", label: "Meeting Notes", type: "textarea", placeholder: "Paste your raw meeting notes here..." },
            { name: "type", label: "Meeting Type", type: "select", options: ["Team Meeting", "Client Meeting", "Planning Session", "Review Meeting", "Other"] }
          ]
        }
      ];
      setTemplates(defaultTemplates);
    }

    // Load run history
    const savedHistory = localStorage.getItem('ai-toolbox-history');
    if (savedHistory) {
      setRunHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save templates to localStorage whenever templates change
  useEffect(() => {
    localStorage.setItem('ai-toolbox-templates', JSON.stringify(templates));
  }, [templates]);

  // Save run history to localStorage whenever history changes
  useEffect(() => {
    localStorage.setItem('ai-toolbox-history', JSON.stringify(runHistory));
  }, [runHistory]);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    prompt: '',
    inputs: [{ name: 'input' }]
  });

  const handleCreateTemplate = () => {
    const template = {
      id: Date.now(),
      ...newTemplate,
      inputs: newTemplate.inputs.filter(input => input.name.trim()).map(input => ({
        ...input,
        label: input.name.charAt(0).toUpperCase() + input.name.slice(1),
        type: 'textarea',
        placeholder: `Enter ${input.name}...`
      }))
    };
    setTemplates([...templates, template]);
    setNewTemplate({
      name: '',
      description: '',
      prompt: '',
      inputs: [{ name: 'input' }]
    });
    setActiveTab('dashboard');
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setNewTemplate(template);
    setIsEditing(true);
    setActiveTab('create');
  };

  const handleUpdateTemplate = () => {
    const updatedTemplate = {
      ...newTemplate,
      id: selectedTemplate.id,
      inputs: newTemplate.inputs.filter(input => input.name.trim()).map(input => ({
        ...input,
        label: input.name.charAt(0).toUpperCase() + input.name.slice(1),
        type: 'textarea',
        placeholder: `Enter ${input.name}...`
      }))
    };
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
    setIsEditing(false);
    setSelectedTemplate(null);
    setNewTemplate({
      name: '',
      description: '',
      prompt: '',
      inputs: [{ name: 'input' }]
    });
    setActiveTab('dashboard');
  };

  const handleDeleteTemplate = (id) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const handleRunTemplate = async (template) => {
    setRunningTemplateId(template.id);
    setRunResult('');
    setSelectedTemplate(template);
    
    try {
      // Replace placeholders in prompt with actual values
      let processedPrompt = template.prompt;
      template.inputs.forEach(input => {
        const value = runInputs[`${template.id}_${input.name}`] || '';
        processedPrompt = processedPrompt.replace(new RegExp(`{${input.name}}`, 'g'), value);
      });

      const response = await window.claude.complete(processedPrompt);
      setRunResult(response);
      
      // Add to history
      const historyEntry = {
        id: Date.now(),
        templateName: template.name,
        timestamp: new Date().toLocaleString(),
        inputs: template.inputs.reduce((acc, input) => {
          acc[input.name] = runInputs[`${template.id}_${input.name}`] || '';
          return acc;
        }, {}),
        result: response
      };
      setRunHistory([historyEntry, ...runHistory]);
      
    } catch (error) {
      setRunResult('Error: Failed to process request. Please try again.');
    }
    
    setRunningTemplateId(null);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const addInputField = () => {
    setNewTemplate({
      ...newTemplate,
      inputs: [...newTemplate.inputs, { name: '' }]
    });
  };

  const updateInputField = (index, field, value) => {
    const updatedInputs = newTemplate.inputs.map((input, i) => 
      i === index ? { ...input, [field]: value } : input
    );
    setNewTemplate({ ...newTemplate, inputs: updatedInputs });
  };

  const removeInputField = (index) => {
    setNewTemplate({
      ...newTemplate,
      inputs: newTemplate.inputs.filter((_, i) => i !== index)
    });
  };

  const groupedTemplates = templates;

  // Add CSS to prevent scrollbar shift
  React.useEffect(() => {
    document.documentElement.style.overflowY = 'scroll';
    return () => {
      document.documentElement.style.overflowY = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6 min-h-[5rem]">
            <h1 className="text-2xl font-bold text-gray-900 flex-shrink-0">AI Toolbox</h1>
            <div className="flex space-x-3 flex-shrink-0">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium min-w-[6rem] flex items-center justify-center ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-lg font-medium min-w-[9rem] flex items-center justify-center ${activeTab === 'create' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Create Template</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg font-medium min-w-[6rem] flex items-center justify-center ${activeTab === 'history' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <History className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>History</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedTemplates.map(template => (
                <div key={template.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      <div className="flex space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                    
                    {/* Template inputs and run section */}
                    <div className="space-y-3 mb-4">
                      {template.inputs.map(input => (
                        <div key={input.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {input.label}
                          </label>
                          <textarea
                            value={runInputs[`${template.id}_${input.name}`] || ''}
                            onChange={(e) => setRunInputs({ 
                              ...runInputs, 
                              [`${template.id}_${input.name}`]: e.target.value 
                            })}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={input.placeholder}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleRunTemplate(template)}
                        disabled={runningTemplateId === template.id}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center min-h-[2.5rem]"
                      >
                        {runningTemplateId === template.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Run
                          </>
                        )}
                      </button>
                      {runResult && selectedTemplate?.id === template.id && (
                        <button
                          onClick={() => copyToClipboard(runResult)}
                          className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg min-h-[2.5rem] flex items-center justify-center"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    
                    {/* Show result if this template was just run */}
                    {runResult && selectedTemplate?.id === template.id && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Result:</span>
                        </div>
                        <div className="text-sm text-gray-900 max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{runResult}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Template */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {isEditing ? 'Edit Template' : 'Create New Template'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter template name"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <button
                      onClick={generateDescription}
                      disabled={isGeneratingDescription || !newTemplate.name.trim()}
                      className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center min-h-[2.5rem]"
                    >
                      {isGeneratingDescription ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        'Generate with AI'
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of what this template does (optional)"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Prompt Template</label>
                    <button
                      onClick={generatePrompt}
                      disabled={isGeneratingPrompt || !newTemplate.name.trim()}
                      className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center min-h-[2.5rem]"
                    >
                      {isGeneratingPrompt ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        'Generate with AI'
                      )}
                    </button>
                  </div>
                  <textarea
                    value={newTemplate.prompt}
                    onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your prompt template. Use {variableName} for dynamic inputs."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Use curly braces to define variables: {'{variableName}'} will be replaced with user input.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Input Variables</label>
                    <button
                      onClick={addInputField}
                      className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 min-h-[2.5rem] flex items-center"
                    >
                      Add Variable
                    </button>
                  </div>
                  
                  {newTemplate.inputs.map((input, index) => (
                    <div key={index} className="flex gap-3 mb-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={input.name}
                          onChange={(e) => updateInputField(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Variable name (e.g., input, content, etc.)"
                        />
                      </div>
                      <button
                        onClick={() => removeInputField(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg min-h-[2.5rem] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-sm text-gray-500 mt-1">
                    All variables will be displayed as text areas for user input.
                  </p>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={isEditing ? handleUpdateTemplate : handleCreateTemplate}
                    disabled={!newTemplate.name.trim()}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 min-h-[2.5rem] flex items-center"
                  >
                    {isEditing ? 'Update Template' : 'Create Template'}
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                      setIsEditing(false);
                      setSelectedTemplate(null);
                      setNewTemplate({
                        name: '',
                        description: '',
                        prompt: '',
                        inputs: [{ name: 'input' }]
                      });
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 min-h-[2.5rem] flex items-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Run History</h2>
              </div>
              
              <div className="divide-y">
                {runHistory.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No runs yet. Start by running a template!
                  </div>
                ) : (
                  runHistory.map(entry => (
                    <div key={entry.id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{entry.templateName}</h3>
                          <p className="text-sm text-gray-500">{entry.timestamp}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(entry.result)}
                          className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center min-h-[2.5rem]"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </button>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-900 max-h-48 overflow-y-auto">
                          {entry.result}
                        </pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIToolbox;