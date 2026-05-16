/**
 * agent.js - Agentic chatbot with full CRUD tool-calling via Groq
 */

const Agent = (() => {
  let isOpen = false;
  let isThinking = false;
  let conversationHistory = []; // { role, content } — sent to Groq
  let onDataChange = null; // callback to refresh current page

  // ============================================
  // Tool definitions (sent to Groq as tools)
  // ============================================
  const TOOLS = [
    {
      type: 'function',
      function: {
        name: 'list_tasks',
        description: 'List tasks, optionally filtered by status or priority. Returns structured task data.',
        parameters: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['all','not-started','in-progress','done','blocked','backlog'], description: 'Filter by status' },
            priority: { type: 'string', enum: ['all','low','medium','high','urgent'], description: 'Filter by priority' },
            limit: { type: 'number', description: 'Max number of tasks to return (default 20)' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_task',
        description: 'Create a new task.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Task name (required)' },
            status: { type: 'string', enum: ['not-started','in-progress','done','blocked','backlog'], description: 'Default: not-started' },
            priority: { type: 'string', enum: ['low','medium','high','urgent'], description: 'Default: medium' },
            energy: { type: 'string', enum: ['low','medium','high'], description: 'Energy level required. Default: medium' },
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'Due date YYYY-MM-DD' },
            projectId: { type: 'string', description: 'Project ID to link to' },
            notes: { type: 'string', description: 'Optional notes' }
          },
          required: ['name']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_task',
        description: 'Update an existing task by ID or name.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' },
            name_query: { type: 'string', description: 'Search task by name if ID unknown' },
            updates: {
              type: 'object',
              description: 'Fields to update',
              properties: {
                name: { type: 'string' },
                status: { type: 'string', enum: ['not-started','in-progress','done','blocked','backlog'] },
                priority: { type: 'string', enum: ['low','medium','high','urgent'] },
                energy: { type: 'string', enum: ['low','medium','high'] },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                projectId: { type: 'string' },
                notes: { type: 'string' }
              }
            }
          },
          required: ['updates']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'delete_task',
        description: 'Delete a task by ID or name.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' },
            name_query: { type: 'string', description: 'Search task by name if ID unknown' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_projects',
        description: 'List projects, optionally filtered by status.',
        parameters: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['all','not-started','in-progress','done','backlog'] }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_project',
        description: 'Create a new project.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name (required)' },
            status: { type: 'string', enum: ['not-started','in-progress','done','backlog'] },
            priority: { type: 'string', enum: ['low','medium','high','urgent'] },
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'YYYY-MM-DD' },
            description: { type: 'string' }
          },
          required: ['name']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_project',
        description: 'Update an existing project by ID or name.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name_query: { type: 'string' },
            updates: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                status: { type: 'string', enum: ['not-started','in-progress','done','backlog'] },
                priority: { type: 'string', enum: ['low','medium','high','urgent'] },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                description: { type: 'string' }
              }
            }
          },
          required: ['updates']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'delete_project',
        description: 'Delete a project by ID or name.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name_query: { type: 'string' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_reminders',
        description: 'List reminders, optionally only pending ones.',
        parameters: {
          type: 'object',
          properties: {
            pending_only: { type: 'boolean', description: 'If true, only return incomplete reminders' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_reminder',
        description: 'Create a new reminder.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Reminder title (required)' },
            description: { type: 'string' },
            datetime: { type: 'string', description: 'ISO datetime string e.g. 2025-05-18T10:00:00' }
          },
          required: ['title', 'datetime']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_reminder',
        description: 'Update or mark a reminder done.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title_query: { type: 'string' },
            updates: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                datetime: { type: 'string' },
                done: { type: 'boolean' }
              }
            }
          },
          required: ['updates']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'delete_reminder',
        description: 'Delete a reminder by ID or title.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title_query: { type: 'string' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_summary',
        description: 'Get a full summary of all data: task counts by status, project counts, upcoming reminders, overdue tasks.',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    }
  ];

  // ============================================
  // Tool executor — runs locally against Store
  // ============================================
  function executeTool(name, args) {
    try {
      switch (name) {

        case 'list_tasks': {
          let tasks = Store.tasks.getAll();
          if (args.status && args.status !== 'all') tasks = tasks.filter(t => t.status === args.status);
          if (args.priority && args.priority !== 'all') tasks = tasks.filter(t => t.priority === args.priority);
          const limit = args.limit || 50;
          tasks = tasks.slice(0, limit);
          const projects = Store.projects.getAll();
          return tasks.map(t => ({
            id: t.id, name: t.name, status: t.status, priority: t.priority,
            energy: t.energy, startDate: t.startDate, endDate: t.endDate,
            project: projects.find(p => p.id === t.projectId)?.name || null,
            notes: t.notes, overdue: Utils.isOverdue(t.endDate) && t.status !== 'done'
          }));
        }

        case 'create_task': {
          const task = Store.tasks.add({
            name: args.name, status: args.status || 'not-started',
            priority: args.priority || 'medium', energy: args.energy || 'medium',
            startDate: args.startDate || '', endDate: args.endDate || '',
            projectId: args.projectId || '', notes: args.notes || ''
          });
          triggerRefresh();
          return { success: true, id: task.id, name: task.name };
        }

        case 'update_task': {
          let task = args.id ? Store.tasks.getById(args.id) : null;
          if (!task && args.name_query) {
            const q = args.name_query.toLowerCase();
            task = Store.tasks.getAll().find(t => t.name.toLowerCase().includes(q));
          }
          if (!task) return { success: false, error: 'Task not found' };
          Store.tasks.update(task.id, args.updates);
          triggerRefresh();
          return { success: true, id: task.id, name: task.name, updated: args.updates };
        }

        case 'delete_task': {
          let task = args.id ? Store.tasks.getById(args.id) : null;
          if (!task && args.name_query) {
            const q = args.name_query.toLowerCase();
            task = Store.tasks.getAll().find(t => t.name.toLowerCase().includes(q));
          }
          if (!task) return { success: false, error: 'Task not found' };
          const taskName = task.name;
          Store.tasks.delete(task.id);
          triggerRefresh();
          return { success: true, deleted: taskName };
        }

        case 'list_projects': {
          let projects = Store.projects.getAll();
          if (args.status && args.status !== 'all') projects = projects.filter(p => p.status === args.status);
          return projects.map(p => ({
            id: p.id, name: p.name, status: p.status, priority: p.priority,
            startDate: p.startDate, endDate: p.endDate, description: p.description,
            taskCount: Store.projects.getTaskCount(p.id),
            completedTasks: Store.projects.getCompletedTaskCount(p.id)
          }));
        }

        case 'create_project': {
          const proj = Store.projects.add({
            name: args.name, status: args.status || 'not-started',
            priority: args.priority || 'medium', startDate: args.startDate || '',
            endDate: args.endDate || '', description: args.description || ''
          });
          triggerRefresh();
          return { success: true, id: proj.id, name: proj.name };
        }

        case 'update_project': {
          let proj = args.id ? Store.projects.getById(args.id) : null;
          if (!proj && args.name_query) {
            const q = args.name_query.toLowerCase();
            proj = Store.projects.getAll().find(p => p.name.toLowerCase().includes(q));
          }
          if (!proj) return { success: false, error: 'Project not found' };
          Store.projects.update(proj.id, args.updates);
          triggerRefresh();
          return { success: true, id: proj.id, name: proj.name, updated: args.updates };
        }

        case 'delete_project': {
          let proj = args.id ? Store.projects.getById(args.id) : null;
          if (!proj && args.name_query) {
            const q = args.name_query.toLowerCase();
            proj = Store.projects.getAll().find(p => p.name.toLowerCase().includes(q));
          }
          if (!proj) return { success: false, error: 'Project not found' };
          const projName = proj.name;
          Store.projects.delete(proj.id);
          triggerRefresh();
          return { success: true, deleted: projName };
        }

        case 'list_reminders': {
          let reminders = Store.reminders.getAll();
          if (args.pending_only) reminders = reminders.filter(r => !r.done);
          return reminders.map(r => ({
            id: r.id, title: r.title, description: r.description,
            datetime: r.datetime, done: r.done,
            formatted: Utils.formatDateTime(r.datetime)
          }));
        }

        case 'create_reminder': {
          const rem = Store.reminders.add({
            title: args.title, description: args.description || '',
            datetime: args.datetime
          });
          triggerRefresh();
          return { success: true, id: rem.id, title: rem.title };
        }

        case 'update_reminder': {
          let rem = args.id ? Store.reminders.getById(args.id) : null;
          if (!rem && args.title_query) {
            const q = args.title_query.toLowerCase();
            rem = Store.reminders.getAll().find(r => r.title.toLowerCase().includes(q));
          }
          if (!rem) return { success: false, error: 'Reminder not found' };
          Store.reminders.update(rem.id, args.updates);
          triggerRefresh();
          return { success: true, id: rem.id, title: rem.title, updated: args.updates };
        }

        case 'delete_reminder': {
          let rem = args.id ? Store.reminders.getById(args.id) : null;
          if (!rem && args.title_query) {
            const q = args.title_query.toLowerCase();
            rem = Store.reminders.getAll().find(r => r.title.toLowerCase().includes(q));
          }
          if (!rem) return { success: false, error: 'Reminder not found' };
          const remTitle = rem.title;
          Store.reminders.delete(rem.id);
          triggerRefresh();
          return { success: true, deleted: remTitle };
        }

        case 'get_summary': {
          const tasks = Store.tasks.getAll();
          const projects = Store.projects.getAll();
          const reminders = Store.reminders.getAll();
          const statusCount = (arr, s) => arr.filter(x => x.status === s).length;
          return {
            tasks: {
              total: tasks.length,
              inProgress: statusCount(tasks, 'in-progress'),
              notStarted: statusCount(tasks, 'not-started'),
              done: statusCount(tasks, 'done'),
              blocked: statusCount(tasks, 'blocked'),
              backlog: statusCount(tasks, 'backlog'),
              overdue: Store.tasks.getOverdue().length,
              completedToday: Store.tasks.getCompletedToday().length
            },
            projects: {
              total: projects.length,
              inProgress: statusCount(projects, 'in-progress'),
              notStarted: statusCount(projects, 'not-started'),
              done: statusCount(projects, 'done'),
              backlog: statusCount(projects, 'backlog')
            },
            reminders: {
              total: reminders.length,
              pending: reminders.filter(r => !r.done).length,
              upcoming: Store.reminders.getUpcoming().slice(0, 3).map(r => ({
                title: r.title, when: Utils.formatDateTime(r.datetime)
              }))
            },
            onTimeRate: Store.stats.getOnTimeRate() + '%',
            streak: Store.stats.get().streakDays + ' days'
          };
        }

        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (err) {
      return { error: err.message };
    }
  }

  function triggerRefresh() {
    // Refresh the current page view after data changes
    const route = Router.getCurrentRoute();
    const container = document.getElementById('page-content');
    if (!container) return;
    if (route === 'dashboard') {
      // re-render dashboard
      if (typeof App !== 'undefined' && App._renderDashboard) App._renderDashboard(container);
    } else if (route === 'tasks') {
      Tasks.render(container);
    } else if (route === 'projects') {
      Projects.render(container);
    } else if (route === 'stats') {
      Stats.render(container);
    }
    // Update sidebar reminder badge
    Reminders.updateBadgeGlobal();
  }

  // ============================================
  // Groq API — agentic loop with tool calling
  // ============================================
  async function runAgentLoop(userMessage) {
    const apiKey = Store.settings.getSetting('groqApiKey');
    if (!apiKey) {
      return '⚠️ No Groq API key set. Go to **Settings → AI & Search** to add your key.';
    }

    const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const systemPrompt = `You are a smart personal productivity assistant embedded in a dashboard app called Command Center. Today is ${today}.

You have access to tools to read and manage the user's tasks, projects, and reminders stored locally. Always use tools to get fresh data before answering questions about it.

When presenting data:
- Use clear formatting with **bold** for names, bullet points for lists
- Show status, priority, and dates when relevant
- For CRUD operations, confirm what was done
- Be concise but complete
- If asked to create/update/delete, use the appropriate tool and confirm the action

The user's name is Saikiran.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    let iterations = 0;
    const MAX_ITERATIONS = 6;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 1024,
          temperature: 0.4
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;

      if (!msg) throw new Error('Empty response from API');

      // Add assistant message to history
      messages.push(msg);

      // If no tool calls, we have the final answer
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        // Save to conversation history (trim to last 12 turns)
        conversationHistory.push({ role: 'user', content: userMessage });
        conversationHistory.push({ role: 'assistant', content: msg.content });
        if (conversationHistory.length > 24) conversationHistory = conversationHistory.slice(-24);
        return msg.content;
      }

      // Execute each tool call and add results
      for (const toolCall of msg.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs = {};
        try { toolArgs = JSON.parse(toolCall.function.arguments); } catch {}

        // Show tool call in UI
        appendToolCallIndicator(toolName);

        const result = executeTool(toolName, toolArgs);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
    }

    return 'I ran into an issue completing that request. Please try again.';
  }

  // ============================================
  // UI rendering
  // ============================================
  function init() {
    // Create FAB
    const fab = document.createElement('button');
    fab.className = 'agent-fab';
    fab.id = 'agent-fab';
    fab.title = 'Open AI Assistant';
    fab.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    document.body.appendChild(fab);

    // Create panel
    const panel = document.createElement('div');
    panel.className = 'agent-panel hidden';
    panel.id = 'agent-panel';
    panel.innerHTML = buildPanelHTML();
    document.body.appendChild(panel);

    // FAB click
    fab.addEventListener('click', togglePanel);

    // Wire up panel events
    bindPanelEvents(panel);
  }

  function buildPanelHTML() {
    return `
      <div class="agent-header">
        <div class="agent-header-avatar">✦</div>
        <div class="agent-header-info">
          <div class="agent-header-name">AI Assistant</div>
          <div class="agent-header-status">
            <span class="agent-status-dot"></span>
            Ready · Groq llama-3.3-70b
          </div>
        </div>
        <div class="agent-header-actions">
          <button class="btn-icon" id="agent-clear-btn" title="Clear chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
          <button class="btn-icon" id="agent-close-btn" title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="agent-messages" id="agent-messages">
        ${buildWelcomeMessage()}
      </div>
      <div class="agent-suggestions" id="agent-suggestions">
        ${buildSuggestions()}
      </div>
      <div class="agent-input-area">
        <div class="agent-input-row">
          <textarea class="agent-input" id="agent-input" placeholder="Ask anything about your tasks, projects..." rows="1"></textarea>
          <button class="agent-send-btn" id="agent-send-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function buildWelcomeMessage() {
    return `
      <div class="agent-msg assistant">
        <div class="agent-msg-avatar">✦</div>
        <div class="agent-msg-bubble">
          <p>Hi Saikiran! 👋 I'm your AI assistant. I have full access to your tasks, projects, and reminders.</p>
          <p>I can <strong>create, update, delete</strong> items or give you a <strong>structured summary</strong> of your work. What can I help with?</p>
        </div>
      </div>
    `;
  }

  function buildSuggestions() {
    const chips = [
      'Show my summary',
      'What\'s overdue?',
      'List in-progress tasks',
      'Add a task',
      'Show all projects',
      'Pending reminders'
    ];
    return chips.map(c =>
      `<button class="agent-suggestion-chip" data-prompt="${c}">${c}</button>`
    ).join('');
  }

  function bindPanelEvents(panel) {
    // Close
    panel.querySelector('#agent-close-btn').addEventListener('click', () => togglePanel(false));

    // Clear
    panel.querySelector('#agent-clear-btn').addEventListener('click', () => {
      conversationHistory = [];
      const msgs = panel.querySelector('#agent-messages');
      msgs.innerHTML = buildWelcomeMessage();
      panel.querySelector('#agent-suggestions').innerHTML = buildSuggestions();
      bindSuggestions(panel);
    });

    // Send
    const input = panel.querySelector('#agent-input');
    const sendBtn = panel.querySelector('#agent-send-btn');

    sendBtn.addEventListener('click', () => sendMessage(panel));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(panel);
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    bindSuggestions(panel);
  }

  function bindSuggestions(panel) {
    panel.querySelectorAll('.agent-suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = panel.querySelector('#agent-input');
        input.value = chip.dataset.prompt;
        sendMessage(panel);
      });
    });
  }

  async function sendMessage(panel) {
    if (isThinking) return;
    const input = panel.querySelector('#agent-input');
    const text = input.value.trim();
    if (!text) return;

    // Check API key
    const apiKey = Store.settings.getSetting('groqApiKey');
    if (!apiKey) {
      appendMessage(panel, 'assistant', '⚠️ No Groq API key configured. Go to **Settings → AI & Search** to add your key from [console.groq.com](https://console.groq.com).');
      return;
    }

    // Clear suggestions
    panel.querySelector('#agent-suggestions').innerHTML = '';

    // Append user message
    appendMessage(panel, 'user', text);
    input.value = '';
    input.style.height = 'auto';

    // Show typing
    isThinking = true;
    panel.querySelector('#agent-send-btn').disabled = true;
    const typingEl = appendTyping(panel);

    try {
      const reply = await runAgentLoop(text);
      typingEl.remove();
      appendMessage(panel, 'assistant', reply);
    } catch (err) {
      typingEl.remove();
      appendMessage(panel, 'assistant', `❌ Error: ${err.message}`);
    } finally {
      isThinking = false;
      panel.querySelector('#agent-send-btn').disabled = false;
    }
  }

  function appendMessage(panel, role, content) {
    const msgs = panel.querySelector('#agent-messages');
    const div = document.createElement('div');
    div.className = `agent-msg ${role}`;

    const avatarText = role === 'assistant' ? '✦' : 'SK';
    const bubbleContent = role === 'assistant' ? renderMarkdown(content) : Utils.escapeHtml(content);

    div.innerHTML = `
      <div class="agent-msg-avatar">${avatarText}</div>
      <div class="agent-msg-bubble">${bubbleContent}</div>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function appendTyping(panel) {
    const msgs = panel.querySelector('#agent-messages');
    const div = document.createElement('div');
    div.className = 'agent-msg assistant';
    div.id = 'agent-typing';
    div.innerHTML = `
      <div class="agent-msg-avatar">✦</div>
      <div class="agent-typing-dots"><span></span><span></span><span></span></div>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function appendToolCallIndicator(toolName) {
    const msgs = document.getElementById('agent-messages');
    if (!msgs) return;
    const icons = {
      list_tasks: '📋', create_task: '✅', update_task: '✏️', delete_task: '🗑️',
      list_projects: '📁', create_project: '🆕', update_project: '✏️', delete_project: '🗑️',
      list_reminders: '🔔', create_reminder: '🔔', update_reminder: '✏️', delete_reminder: '🗑️',
      get_summary: '📊'
    };
    const labels = {
      list_tasks: 'Reading tasks…', create_task: 'Creating task…', update_task: 'Updating task…', delete_task: 'Deleting task…',
      list_projects: 'Reading projects…', create_project: 'Creating project…', update_project: 'Updating project…', delete_project: 'Deleting project…',
      list_reminders: 'Reading reminders…', create_reminder: 'Creating reminder…', update_reminder: 'Updating reminder…', delete_reminder: 'Deleting reminder…',
      get_summary: 'Getting summary…'
    };
    const indicator = document.createElement('div');
    indicator.className = 'agent-msg assistant';
    indicator.innerHTML = `
      <div class="agent-msg-avatar" style="opacity:0.4">✦</div>
      <div class="agent-tool-call">
        <span class="agent-tool-call-icon">${icons[toolName] || '⚙️'}</span>
        <span>${labels[toolName] || toolName}</span>
      </div>
    `;
    msgs.appendChild(indicator);
    msgs.scrollTop = msgs.scrollHeight;
    // Auto-remove after 3s
    setTimeout(() => { if (indicator.parentNode) indicator.remove(); }, 3000);
  }

  // Simple markdown renderer
  function renderMarkdown(text) {
    if (!text) return '';
    let html = Utils.escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Headers
    html = html.replace(/^### (.+)$/gm, '<strong style="font-size:0.9375rem">$1</strong>');
    html = html.replace(/^## (.+)$/gm, '<strong style="font-size:1rem">$1</strong>');
    html = html.replace(/^# (.+)$/gm, '<strong style="font-size:1.0625rem">$1</strong>');
    // Bullet lists
    html = html.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    // HR
    html = html.replace(/^---$/gm, '<hr>');
    // Line breaks → paragraphs
    const paras = html.split(/\n\n+/);
    html = paras.map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<ul>') || p.startsWith('<ol>') || p.startsWith('<hr>') || p.startsWith('<strong')) return p;
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');
    return html;
  }

  function togglePanel(forceState) {
    const panel = document.getElementById('agent-panel');
    const fab = document.getElementById('agent-fab');
    if (!panel || !fab) return;

    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    panel.classList.toggle('hidden', !isOpen);
    fab.classList.toggle('open', isOpen);

    if (isOpen) {
      setTimeout(() => {
        const input = panel.querySelector('#agent-input');
        if (input) input.focus();
      }, 100);
    }
  }

  return { init };
})();
