/**
 * app.js - Main application entry point
 */

const App = (() => {

  // ============================================
  // Sidebar
  // ============================================
  function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const pendingReminders = Store.reminders.getPending().length;

    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">N</div>
        <span class="sidebar-logo-text">Command Center</span>
      </div>

      <nav class="sidebar-nav">
        <a class="nav-item" data-route="dashboard" href="#dashboard">
          <span class="nav-icon">${Utils.icons.dashboard}</span>
          <span class="nav-label">Dashboard</span>
        </a>
        <a class="nav-item" data-route="tasks" href="#tasks">
          <span class="nav-icon">${Utils.icons.tasks}</span>
          <span class="nav-label">Tasks</span>
        </a>
        <a class="nav-item" data-route="projects" href="#projects">
          <span class="nav-icon">${Utils.icons.projects}</span>
          <span class="nav-label">Projects</span>
        </a>
        <a class="nav-item" data-route="stats" href="#stats">
          <span class="nav-icon">${Utils.icons.stats}</span>
          <span class="nav-label">Stats</span>
        </a>
        <a class="nav-item reminders-trigger" id="reminders-nav-btn" href="#" data-route="reminders">
          <span class="nav-icon">${Utils.icons.reminders}</span>
          <span class="nav-label">Reminders</span>
          ${pendingReminders > 0 ? `<span class="nav-badge">${pendingReminders}</span>` : ''}
        </a>
        <a class="nav-item" data-route="quick-links" href="#quick-links">
          <span class="nav-icon">${Utils.icons.links}</span>
          <span class="nav-label">Quick Links</span>
        </a>
        <a class="nav-item" data-route="settings" href="#settings">
          <span class="nav-icon">${Utils.icons.settings}</span>
          <span class="nav-label">Settings</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="avatar">SK</div>
        <span class="avatar-name">Saikiran</span>
        <span class="avatar-chevron">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </div>
    `;

    sidebar.querySelector('#reminders-nav-btn').addEventListener('click', (e) => {
      e.preventDefault();
      Reminders.openModal();
    });
  }

  // ============================================
  // Search Bar
  // ============================================
  function renderSearchBar() {
    const container = document.getElementById('search-bar-container');
    if (!container) return;

    container.innerHTML = `
      <div class="search-wrapper">
        <div class="search-input-wrapper">
          <span class="search-ai-icon">✦</span>
          <input
            type="text"
            id="search-input"
            placeholder='Ask anything... (e.g., "Show my tasks due today")'
            autocomplete="off"
            spellcheck="false"
          />
          <span class="search-shortcut">⌘ K</span>
        </div>
      </div>
    `;
  }

  // ============================================
  // Routes
  // ============================================
  function registerRoutes() {
    Router.register('dashboard', renderDashboard);
    Router.register('tasks', (c) => Tasks.render(c));
    Router.register('projects', (c) => Projects.render(c));
    Router.register('stats', (c) => Stats.render(c));
    Router.register('quick-links', (c) => QuickLinks.render(c));
    Router.register('settings', (c) => Settings.render(c));
  }

  // ============================================
  // Dashboard
  // ============================================
  function renderDashboard(container) {
    const allTasks = Store.tasks.getAll();
    const activeTasks = allTasks.filter(t => t.status === 'in-progress');
    const backlogTasks = allTasks.filter(t => t.status === 'backlog' || t.status === 'not-started');
    const completedTasks = allTasks.filter(t => t.status === 'done');

    const allProjects = Store.projects.getAll();
    const activeProjects = allProjects.filter(p => p.status === 'in-progress');
    const backlogProjects = allProjects.filter(p => p.status === 'backlog' || p.status === 'not-started');
    const completedProjects = allProjects.filter(p => p.status === 'done');

    const links = Store.quickLinks.getAll().slice(0, 7);
    const reminders = Store.reminders.getAll()
      .filter(r => !r.done)
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .slice(0, 5);

    const completedToday = Store.tasks.getCompletedToday();
    const overdue = Store.tasks.getOverdue();
    const onTimeRate = Store.stats.getOnTimeRate();

    // Upcoming tasks (not done, sorted by endDate)
    const upcomingTasks = allTasks
      .filter(t => t.status !== 'done')
      .sort((a, b) => {
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return a.endDate.localeCompare(b.endDate);
      })
      .slice(0, 5);

    const greeting = Utils.getGreeting();
    const greetingEmoji = greeting.includes('morning') ? '!' : greeting.includes('afternoon') ? '☀️' : greeting.includes('evening') ? '🌆' : '🌙';

    container.innerHTML = `
      <!-- Greeting -->
      <div class="dashboard-greeting">
        <div class="dashboard-greeting-title">
          ${greeting}, Saikiran ${greetingEmoji}
        </div>
        <div class="dashboard-greeting-sub">Let's make today productive.</div>
      </div>

      <!-- Main 2-col grid: Tasks | Projects -->
      <div class="dashboard-main-grid">
        ${renderTasksBlock(activeTasks, backlogTasks, completedTasks)}
        ${renderProjectsBlock(activeProjects, backlogProjects, completedProjects)}
      </div>

      <!-- Bottom grid: Quick Links | Today's Overview -->
      <div class="dashboard-bottom-grid">
        ${renderQuickLinksBlock(links)}
        ${renderOverviewBlock(completedToday, onTimeRate, overdue)}
      </div>

      <!-- Upcoming Tasks -->
      ${renderUpcomingBlock(upcomingTasks, allProjects)}
    `;

    // Bind quick-add link button
    const addLinkBtn = container.querySelector('#dash-add-link-btn');
    if (addLinkBtn) {
      addLinkBtn.addEventListener('click', () => {
        QuickLinks.showAddLinkModalPublic(() => {
          const pc = document.getElementById('page-content');
          if (pc) renderDashboard(pc);
        });
      });
    }

    // Bind view all links
    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate(el.dataset.nav);
      });
    });

    // Bind reminder rows
    container.querySelectorAll('.reminder-row[data-id]').forEach(row => {
      row.addEventListener('click', () => Reminders.openModal());
    });

    // Bind upcoming task checkboxes
    container.querySelectorAll('.upcoming-task-checkbox[data-id]').forEach(cb => {
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        const task = Store.tasks.getById(cb.dataset.id);
        if (task) {
          const newStatus = task.status === 'done' ? 'not-started' : 'done';
          Store.tasks.update(task.id, { status: newStatus });
          Utils.toast(newStatus === 'done' ? 'Task completed ✓' : 'Task reopened', 'success');
          const pc = document.getElementById('page-content');
          if (pc) renderDashboard(pc);
        }
      });
    });

    // Bind upcoming task rows
    container.querySelectorAll('.upcoming-table tr[data-task-id]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.upcoming-task-checkbox')) return;
        const task = Store.tasks.getById(row.dataset.taskId);
        if (task) {
          Tasks.showTaskModal(task, () => {
            const pc = document.getElementById('page-content');
            if (pc) renderDashboard(pc);
          });
        }
      });
    });
  }

  // ============================================
  // Dashboard block renderers
  // ============================================
  function renderTasksBlock(active, backlog, completed) {
    return `
      <div class="section-block">
        <div class="section-block-header">
          <div class="section-block-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Tasks
          </div>
          <button class="section-block-link" data-nav="tasks">View all tasks →</button>
        </div>
        <div class="section-stats-row">
          <div class="section-stat">
            <div class="section-stat-label active">Active</div>
            <div class="section-stat-value">${active.length}</div>
            <div class="section-stat-sub">In progress</div>
          </div>
          <div class="section-stat">
            <div class="section-stat-label backlog">Backlog</div>
            <div class="section-stat-value">${backlog.length}</div>
            <div class="section-stat-sub">Not started</div>
          </div>
          <div class="section-stat">
            <div class="section-stat-label completed">Completed</div>
            <div class="section-stat-value">${completed.length}</div>
            <div class="section-stat-sub">Done</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderProjectsBlock(active, backlog, completed) {
    return `
      <div class="section-block">
        <div class="section-block-header">
          <div class="section-block-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            Projects
          </div>
          <button class="section-block-link" data-nav="projects">View all projects →</button>
        </div>
        <div class="section-stats-row">
          <div class="section-stat">
            <div class="section-stat-label active">Active</div>
            <div class="section-stat-value">${active.length}</div>
            <div class="section-stat-sub">In progress</div>
          </div>
          <div class="section-stat">
            <div class="section-stat-label backlog">Backlog</div>
            <div class="section-stat-value">${backlog.length}</div>
            <div class="section-stat-sub">Not started</div>
          </div>
          <div class="section-stat">
            <div class="section-stat-label completed">Completed</div>
            <div class="section-stat-value">${completed.length}</div>
            <div class="section-stat-sub">Done</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderRightColumn(reminders) {
    const dotColors = ['blue', 'orange', 'purple', 'green', 'red'];
    return `
      <div class="reminders-block">
        <div class="reminders-block-header">
          <div class="reminders-block-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Reminders
          </div>
          <button class="section-block-link" id="open-reminders-header-btn">View all →</button>
          ${reminders.length === 0 ? `
            <div style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:0.8125rem">No pending reminders</div>
          ` : reminders.map((r, i) => `
            <div class="reminder-row" data-id="${r.id}">
              <div class="reminder-dot ${dotColors[i % dotColors.length]}"></div>
              <div class="reminder-row-content">
                <div class="reminder-row-title">${Utils.escapeHtml(r.title)}</div>
                <div class="reminder-row-time">${Utils.formatDateTime(r.datetime)}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="reminders-block-footer">
          <button class="section-block-link" id="open-reminders-btn" style="padding:0">View all reminders →</button>
        </div>
      </div>
    `;
  }

  function renderQuickLinksBlock(links) {
    const linkItems = links.map(link => `
      <div class="ql-item" onclick="window.open('${Utils.escapeHtml(link.url)}','_blank','noopener')">
        <div class="ql-favicon-wrap">
          ${link.favicon
            ? `<img src="${Utils.escapeHtml(link.favicon)}" alt="" onerror="this.parentElement.innerHTML='<span style=font-size:1rem;font-weight:700;color:var(--text-secondary)>${link.name.charAt(0)}</span>'" />`
            : `<span style="font-size:1rem;font-weight:700;color:var(--text-secondary)">${link.name.charAt(0)}</span>`
          }
        </div>
        <div class="ql-name">${Utils.escapeHtml(link.name)}</div>
        <div class="ql-domain">${Utils.getDomain(link.url)}</div>
      </div>
    `).join('');

    return `
      <div class="quicklinks-block">
        <div class="quicklinks-block-header">
          <div class="quicklinks-block-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Quick Links
          </div>
          <div class="quicklinks-view-btns">
            <button class="ql-view-btn active">Gallery</button>
            <button class="ql-view-btn" data-nav="quick-links">List</button>
          </div>
        </div>
        <div class="quicklinks-block-grid">
          ${linkItems}
          <button class="ql-add-btn" id="dash-add-link-btn">
            <span style="font-size:1.25rem;line-height:1">+</span>
            <span>Add Link</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderOverviewBlock(completedToday, onTimeRate, overdue) {
    // Generate a simple line chart path
    const weeklyData = Store.stats.getWeeklyData();
    const maxVal = Math.max(...weeklyData.map(d => d.completed), 1);
    const w = 280, h = 80;
    const points = weeklyData.map((d, i) => {
      const x = (i / (weeklyData.length - 1)) * w;
      const y = h - (d.completed / maxVal) * h;
      return `${x},${y}`;
    });
    const pathD = `M ${points.join(' L ')}`;
    const areaD = `M 0,${h} L ${points.join(' L ')} L ${w},${h} Z`;

    const timeLabels = ['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'];

    return `
      <div class="overview-block">
        <div class="overview-block-header">
          <div class="overview-block-title">Today's Overview</div>
          <button class="overview-period-btn">
            Today
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <div class="overview-chart-area">
          <svg class="line-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--text-primary)" stop-opacity="0.08"/>
                <stop offset="100%" stop-color="var(--text-primary)" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <!-- Grid lines -->
            <line x1="0" y1="0" x2="${w}" y2="0" stroke="var(--border)" stroke-width="0.5"/>
            <line x1="0" y1="${h/4}" x2="${w}" y2="${h/4}" stroke="var(--border)" stroke-width="0.5"/>
            <line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" stroke="var(--border)" stroke-width="0.5"/>
            <line x1="0" y1="${h*3/4}" x2="${w}" y2="${h*3/4}" stroke="var(--border)" stroke-width="0.5"/>
            <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="var(--border)" stroke-width="0.5"/>
            <!-- Area fill -->
            <path d="${areaD}" fill="url(#areaGrad)"/>
            <!-- Line -->
            <path d="${pathD}" fill="none" stroke="var(--text-primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="line-chart-axis">
            ${timeLabels.map(l => `<span class="line-chart-axis-label">${l}</span>`).join('')}
          </div>
        </div>
        <div class="overview-stats-row">
          <div class="overview-stat">
            <div class="overview-stat-label">Completed</div>
            <div class="overview-stat-value">${completedToday.length}</div>
            <div class="overview-stat-trend trend-up">↑ 12% from yesterday</div>
          </div>
          <div class="overview-stat">
            <div class="overview-stat-label">On Track</div>
            <div class="overview-stat-value">${onTimeRate}%</div>
            <div class="overview-stat-trend trend-neutral">Great job!</div>
          </div>
          <div class="overview-stat">
            <div class="overview-stat-label">Overdue</div>
            <div class="overview-stat-value" style="color:${overdue.length > 0 ? '#dc2626' : 'var(--text-primary)'}">${overdue.length}</div>
            <div class="overview-stat-trend ${overdue.length > 0 ? 'trend-down' : 'trend-neutral'}">
              ${overdue.length > 0 ? `↑ ${overdue.length} from yesterday` : 'All clear!'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderUpcomingBlock(tasks, allProjects) {
    const projectColors = ['#2383e2', '#1a7f37', '#e67e22', '#7c3aed', '#dc2626'];
    const projectColorMap = {};
    allProjects.forEach((p, i) => {
      projectColorMap[p.id] = projectColors[i % projectColors.length];
    });

    return `
      <div class="upcoming-block">
        <div class="upcoming-block-header">
          <div class="upcoming-block-title">Upcoming Tasks</div>
          <button class="section-block-link" data-nav="tasks">View all tasks →</button>
        </div>
        ${tasks.length === 0 ? `
          <div style="padding:24px;text-align:center;color:var(--text-tertiary);font-size:0.875rem">No upcoming tasks</div>
        ` : `
          <table class="upcoming-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Energy</th>
                <th>Timeline</th>
                <th>Project</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(task => {
                const project = task.projectId ? allProjects.find(p => p.id === task.projectId) : null;
                const projColor = project ? (projectColorMap[project.id] || '#9b9a97') : '#9b9a97';
                const isOverdue = Utils.isOverdue(task.endDate);
                return `
                  <tr data-task-id="${task.id}">
                    <td>
                      <div class="upcoming-task-name">
                        <div class="upcoming-task-checkbox ${task.status === 'done' ? 'checked' : ''}" data-id="${task.id}">
                          ${task.status === 'done' ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                        </div>
                        <span style="font-size:0.875rem;font-weight:500;color:var(--text-primary)">${Utils.escapeHtml(task.name)}</span>
                      </div>
                    </td>
                    <td>${Utils.statusBadge(task.status)}</td>
                    <td>${Utils.priorityBadge(task.priority)}</td>
                    <td>${Utils.energyBadge(task.energy)}</td>
                    <td style="font-size:0.8125rem;color:${isOverdue ? '#dc2626' : 'var(--text-secondary)'}">
                      ${task.endDate ? Utils.formatDate(task.endDate, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                    </td>
                    <td>
                      ${project ? `
                        <span style="display:flex;align-items:center;gap:5px;font-size:0.8125rem;color:var(--text-secondary)">
                          <span class="project-dot" style="background:${projColor}"></span>
                          ${Utils.escapeHtml(project.name)}
                        </span>
                      ` : '<span style="color:var(--text-tertiary);font-size:0.8125rem">—</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
        <div class="upcoming-block-footer">
          <button class="section-block-link" data-nav="tasks">View all tasks →</button>
        </div>
      </div>
    `;
  }

  // ============================================
  // Init
  // ============================================
  function init() {
    Settings.applyAllSettings();
    renderSidebar();
    renderSearchBar();
    registerRoutes();
    Router.init();
    Search.init();
    Reminders.startReminderCheck();

    // Open reminders from sidebar badge
    document.addEventListener('click', (e) => {
      if (e.target.closest('#open-reminders-btn') || e.target.closest('#open-reminders-header-btn')) {
        Reminders.openModal();
      }
      Utils.closeAllDropdowns();
    });

    // System theme change
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const s = Store.settings.get();
      if (s.theme === 'auto') Settings.applyAllSettings();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        Tasks.showTaskModal(null, () => {
          if (Router.getCurrentRoute() === 'tasks') {
            const c = document.getElementById('page-content');
            if (c) Tasks.render(c);
          } else if (Router.getCurrentRoute() === 'dashboard') {
            const c = document.getElementById('page-content');
            if (c) renderDashboard(c);
          }
        });
      }
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
