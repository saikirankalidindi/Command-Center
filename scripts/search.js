/**
 * search.js - AI-powered search with Groq API integration
 */

const Search = (() => {
  let searchTimeout = null;
  let isSearchOpen = false;

  /**
   * Initialize the search bar
   */
  function init() {
    const input = document.getElementById('search-input');
    const wrapper = document.querySelector('.search-input-wrapper');
    if (!input || !wrapper) return;

    // Debounced search handler
    input.addEventListener('input', Utils.debounce(handleSearch, 300));

    // Keyboard shortcut: Cmd/Ctrl + K
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if (e.key === 'Escape') {
        closeSearch();
        input.blur();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        closeSearch();
      }
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) handleSearch();
    });
  }

  /**
   * Handle search input
   */
  async function handleSearch() {
    const input = document.getElementById('search-input');
    const query = input ? input.value.trim() : '';

    if (!query || query.length < 2) {
      closeSearch();
      return;
    }

    // Local search first
    const localResults = Store.search.query(query);
    showResults(query, localResults);

    // AI search if API key is set
    const apiKey = Store.settings.getSetting('groqApiKey');
    if (apiKey && query.length > 4) {
      showAILoading();
      try {
        const aiAnswer = await queryGroq(query, apiKey, localResults);
        updateAIAnswer(aiAnswer);
      } catch (err) {
        updateAIAnswer(null);
      }
    }
  }

  /**
   * Query Groq API for AI-powered search
   */
  async function queryGroq(query, apiKey, localResults) {
    // Build context from local data
    const tasks = Store.tasks.getAll().slice(0, 20).map(t =>
      `Task: "${t.name}" (${t.status}, ${t.priority} priority)`
    ).join('\n');

    const projects = Store.projects.getAll().map(p =>
      `Project: "${p.name}" (${p.status})`
    ).join('\n');

    const systemPrompt = `You are a helpful personal dashboard assistant. The user has the following data:

${tasks}
${projects}

Answer the user's query concisely in 1-2 sentences. Focus on actionable insights about their tasks and projects.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  }

  /**
   * Show search results dropdown
   */
  function showResults(query, results) {
    const wrapper = document.querySelector('.search-input-wrapper');
    if (!wrapper) return;

    closeSearch();

    const { tasks, projects, links } = results;
    const hasResults = tasks.length > 0 || projects.length > 0 || links.length > 0;

    const dropdown = document.createElement('div');
    dropdown.className = 'search-results-dropdown';
    dropdown.id = 'search-dropdown';

    if (!hasResults) {
      dropdown.innerHTML = `
        <div class="search-results-section">
          <div style="padding: 16px; text-align: center; color: var(--text-tertiary); font-size: 0.875rem;">
            No results for "<strong>${Utils.escapeHtml(query)}</strong>"
          </div>
        </div>
        <div id="ai-answer-section"></div>
      `;
    } else {
      let html = '';

      if (tasks.length > 0) {
        html += `<div class="search-results-section">
          <div class="search-results-label">Tasks</div>`;
        tasks.forEach(task => {
          html += `
            <div class="search-result-item" data-type="task" data-id="${task.id}">
              <div class="search-result-icon">${Utils.icons.tasks}</div>
              <div class="search-result-content">
                <div class="search-result-title">${Utils.escapeHtml(task.name)}</div>
                <div class="search-result-meta">${Utils.statusBadge(task.status)}</div>
              </div>
            </div>`;
        });
        html += '</div>';
      }

      if (projects.length > 0) {
        html += `<div class="search-results-section">
          <div class="search-results-label">Projects</div>`;
        projects.forEach(proj => {
          html += `
            <div class="search-result-item" data-type="project" data-id="${proj.id}">
              <div class="search-result-icon">${Utils.icons.projects}</div>
              <div class="search-result-content">
                <div class="search-result-title">${Utils.escapeHtml(proj.name)}</div>
                <div class="search-result-meta">${Utils.statusBadge(proj.status)}</div>
              </div>
            </div>`;
        });
        html += '</div>';
      }

      if (links.length > 0) {
        html += `<div class="search-results-section">
          <div class="search-results-label">Quick Links</div>`;
        links.forEach(link => {
          html += `
            <div class="search-result-item" data-type="link" data-url="${Utils.escapeHtml(link.url)}">
              <div class="search-result-icon">
                <img src="${link.favicon}" width="16" height="16" onerror="this.style.display='none'" />
              </div>
              <div class="search-result-content">
                <div class="search-result-title">${Utils.escapeHtml(link.name)}</div>
                <div class="search-result-meta">${Utils.getDomain(link.url)}</div>
              </div>
            </div>`;
        });
        html += '</div>';
      }

      html += '<div id="ai-answer-section"></div>';
      dropdown.innerHTML = html;
    }

    // Click handlers for results
    dropdown.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.type;
        const id = item.dataset.id;
        const url = item.dataset.url;

        if (type === 'task') {
          Router.navigate('tasks');
          closeSearch();
        } else if (type === 'project') {
          Router.navigate('projects');
          closeSearch();
        } else if (type === 'link' && url) {
          window.open(url, '_blank', 'noopener');
          closeSearch();
        }

        document.getElementById('search-input').value = '';
      });
    });

    wrapper.appendChild(dropdown);
    isSearchOpen = true;
  }

  /**
   * Show AI loading state
   */
  function showAILoading() {
    const section = document.getElementById('ai-answer-section');
    if (!section) return;

    section.innerHTML = `
      <div class="search-ai-answer">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span class="search-ai-badge">${Utils.icons.ai} AI</span>
          <span style="font-size:0.75rem;color:var(--text-tertiary)">Thinking...</span>
        </div>
        <div style="height:12px;background:var(--border);border-radius:6px;animation:pulse 1.5s infinite;width:80%"></div>
        <div style="height:12px;background:var(--border);border-radius:6px;animation:pulse 1.5s infinite;width:60%;margin-top:6px"></div>
      </div>`;
  }

  /**
   * Update AI answer in dropdown
   */
  function updateAIAnswer(answer) {
    const section = document.getElementById('ai-answer-section');
    if (!section) return;

    if (!answer) {
      section.innerHTML = '';
      return;
    }

    section.innerHTML = `
      <div class="search-ai-answer">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span class="search-ai-badge">${Utils.icons.ai} AI Answer</span>
        </div>
        <p>${Utils.escapeHtml(answer)}</p>
      </div>`;
  }

  /**
   * Close search dropdown
   */
  function closeSearch() {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown) dropdown.remove();
    isSearchOpen = false;
  }

  return { init, closeSearch };
})();
