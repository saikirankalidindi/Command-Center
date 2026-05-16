/**
 * store.js - localStorage-based data store
 * Manages all application state with persistence
 */

const Store = (() => {
  // ============================================
  // Sample / seed data
  // ============================================
  const d = (offset) => new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
  const ts = (offset) => new Date(Date.now() + offset * 86400000).toISOString();

  const SEED_DATA = {
    tasks: [
      // 8 in-progress
      { id: 'task-1', name: 'Design landing page', status: 'in-progress', priority: 'high', energy: 'high', startDate: d(0), endDate: d(0), projectId: 'proj-1', notes: '', createdAt: ts(-2), completedAt: null },
      { id: 'task-2', name: 'Write weekly report', status: 'in-progress', priority: 'medium', energy: 'medium', startDate: d(0), endDate: d(1), projectId: 'proj-4', notes: '', createdAt: ts(-1), completedAt: null },
      { id: 'task-3', name: 'Review pull requests', status: 'in-progress', priority: 'low', energy: 'low', startDate: d(0), endDate: d(0), projectId: 'proj-2', notes: '', createdAt: ts(-1), completedAt: null },
      { id: 'task-4', name: 'Update component library', status: 'in-progress', priority: 'high', energy: 'high', startDate: d(-1), endDate: d(2), projectId: 'proj-1', notes: '', createdAt: ts(-3), completedAt: null },
      { id: 'task-5', name: 'Fix navigation bug', status: 'in-progress', priority: 'urgent', energy: 'high', startDate: d(0), endDate: d(0), projectId: 'proj-2', notes: '', createdAt: ts(-1), completedAt: null },
      { id: 'task-6', name: 'Write unit tests', status: 'in-progress', priority: 'medium', energy: 'medium', startDate: d(0), endDate: d(3), projectId: 'proj-2', notes: '', createdAt: ts(-2), completedAt: null },
      { id: 'task-7', name: 'Prepare sprint demo', status: 'in-progress', priority: 'high', energy: 'high', startDate: d(0), endDate: d(1), projectId: 'proj-3', notes: '', createdAt: ts(-1), completedAt: null },
      { id: 'task-8', name: 'Update documentation', status: 'in-progress', priority: 'low', energy: 'low', startDate: d(0), endDate: d(5), projectId: 'proj-2', notes: '', createdAt: ts(-2), completedAt: null },
      // 12 backlog/not-started
      { id: 'task-9', name: 'Set up CI/CD pipeline', status: 'backlog', priority: 'medium', energy: 'medium', startDate: '', endDate: '', projectId: 'proj-2', notes: '', createdAt: ts(0), completedAt: null },
      { id: 'task-10', name: 'Implement dark mode', status: 'not-started', priority: 'low', energy: 'low', startDate: d(7), endDate: d(14), projectId: 'proj-1', notes: '', createdAt: ts(0), completedAt: null },
      { id: 'task-11', name: 'User research interviews', status: 'backlog', priority: 'high', energy: 'high', startDate: '', endDate: '', projectId: 'proj-1', notes: '', createdAt: ts(-1), completedAt: null },
      { id: 'task-12', name: 'Migrate to TypeScript', status: 'not-started', priority: 'medium', energy: 'high', startDate: d(10), endDate: d(20), projectId: 'proj-2', notes: '', createdAt: ts(0), completedAt: null },
      { id: 'task-13', name: 'Performance audit', status: 'backlog', priority: 'medium', energy: 'medium', startDate: '', endDate: '', projectId: 'proj-3', notes: '', createdAt: ts(0), completedAt: null },
      { id: 'task-14', name: 'Accessibility review', status: 'not-started', priority: 'high', energy: 'medium', startDate: d(5), endDate: d(8), projectId: 'proj-1', notes: '', createdAt: ts(0), completedAt: null },
      { id: 'task-15', name: 'API rate limiting', status: 'backlog', priority: 'low', energy: 'low', startDate: '', endDate: '', projectId: 'proj-2', notes: '', createdAt: ts(0), completedAt: null },
      { id: 'task-16', name: 'Email templates', status: 'not-started', priority: 'medium', energy: 'medium', startDate: d(3), endDate: d(6), projectId: 'proj-4', notes: '', createdAt: ts(0), completedAt: null },
      { id: 'task-17', name: 'Analytics dashboard', status: 'backlog', priority: 'high', energy: 'high', startDate: '', endDate: '', projectId: 'proj-3', notes: '', createdAt: ts(0), completedAt: null },
      { id: 'task-18', name: 'Onboarding flow', status: 'not-started', priority: 'medium', energy: 'medium', startDate: d(14), endDate: d(21), projectId: 'proj-1', notes: '', createdAt: ts(0), completedAt: null },
      { id: 'task-19', name: 'Search functionality', status: 'backlog', priority: 'high', energy: 'high', startDate: '', endDate: '', projectId: 'proj-2', notes: '', createdAt: ts(0), completedAt: null },
      { id: 'task-20', name: 'Payment integration', status: 'not-started', priority: 'urgent', energy: 'high', startDate: d(7), endDate: d(14), projectId: 'proj-3', notes: '', createdAt: ts(0), completedAt: null },
      // 16 done
      { id: 'task-21', name: 'Fix authentication bug', status: 'done', priority: 'urgent', energy: 'high', startDate: d(-3), endDate: d(-2), projectId: 'proj-2', notes: '', createdAt: ts(-4), completedAt: ts(-2) },
      { id: 'task-22', name: 'Setup project structure', status: 'done', priority: 'high', energy: 'medium', startDate: d(-7), endDate: d(-5), projectId: 'proj-1', notes: '', createdAt: ts(-8), completedAt: ts(-5) },
      { id: 'task-23', name: 'Design system tokens', status: 'done', priority: 'high', energy: 'high', startDate: d(-5), endDate: d(-3), projectId: 'proj-1', notes: '', createdAt: ts(-6), completedAt: ts(-3) },
      { id: 'task-24', name: 'Database schema', status: 'done', priority: 'high', energy: 'high', startDate: d(-6), endDate: d(-4), projectId: 'proj-2', notes: '', createdAt: ts(-7), completedAt: ts(-4) },
      { id: 'task-25', name: 'User auth flow', status: 'done', priority: 'urgent', energy: 'high', startDate: d(-4), endDate: d(-2), projectId: 'proj-2', notes: '', createdAt: ts(-5), completedAt: ts(-2) },
      { id: 'task-26', name: 'Logo design', status: 'done', priority: 'medium', energy: 'medium', startDate: d(-8), endDate: d(-6), projectId: 'proj-1', notes: '', createdAt: ts(-9), completedAt: ts(-6) },
      { id: 'task-27', name: 'Color palette', status: 'done', priority: 'medium', energy: 'low', startDate: d(-7), endDate: d(-5), projectId: 'proj-1', notes: '', createdAt: ts(-8), completedAt: ts(-5) },
      { id: 'task-28', name: 'Typography system', status: 'done', priority: 'medium', energy: 'medium', startDate: d(-6), endDate: d(-4), projectId: 'proj-1', notes: '', createdAt: ts(-7), completedAt: ts(-4) },
      { id: 'task-29', name: 'REST API endpoints', status: 'done', priority: 'high', energy: 'high', startDate: d(-5), endDate: d(-3), projectId: 'proj-2', notes: '', createdAt: ts(-6), completedAt: ts(-3) },
      { id: 'task-30', name: 'Error handling', status: 'done', priority: 'high', energy: 'medium', startDate: d(-4), endDate: d(-2), projectId: 'proj-2', notes: '', createdAt: ts(-5), completedAt: ts(-2) },
      { id: 'task-31', name: 'Responsive layout', status: 'done', priority: 'high', energy: 'high', startDate: d(-3), endDate: d(-1), projectId: 'proj-1', notes: '', createdAt: ts(-4), completedAt: ts(-1) },
      { id: 'task-32', name: 'Form validation', status: 'done', priority: 'medium', energy: 'medium', startDate: d(-3), endDate: d(-1), projectId: 'proj-2', notes: '', createdAt: ts(-4), completedAt: ts(-1) },
      { id: 'task-33', name: 'Loading states', status: 'done', priority: 'low', energy: 'low', startDate: d(-2), endDate: d(-1), projectId: 'proj-1', notes: '', createdAt: ts(-3), completedAt: ts(-1) },
      { id: 'task-34', name: 'Toast notifications', status: 'done', priority: 'low', energy: 'low', startDate: d(-2), endDate: d(-1), projectId: 'proj-1', notes: '', createdAt: ts(-3), completedAt: ts(-1) },
      { id: 'task-35', name: 'Sidebar navigation', status: 'done', priority: 'high', energy: 'medium', startDate: d(-4), endDate: d(-2), projectId: 'proj-1', notes: '', createdAt: ts(-5), completedAt: ts(-2) },
      { id: 'task-36', name: 'Data persistence', status: 'done', priority: 'high', energy: 'high', startDate: d(-3), endDate: d(-1), projectId: 'proj-2', notes: '', createdAt: ts(-4), completedAt: ts(-1) },
    ],
    projects: [
      // 5 in-progress
      { id: 'proj-1', name: 'Website Redesign', status: 'in-progress', priority: 'high', startDate: d(-14), endDate: d(30), description: 'Complete overhaul of the product UI/UX', createdAt: ts(-14) },
      { id: 'proj-2', name: 'Dev Dashboard', status: 'in-progress', priority: 'high', startDate: d(-7), endDate: d(21), description: 'Personal developer dashboard with AI features', createdAt: ts(-7) },
      { id: 'proj-3', name: 'Mobile App', status: 'in-progress', priority: 'medium', startDate: d(-5), endDate: d(45), description: 'iOS and Android app development', createdAt: ts(-5) },
      { id: 'proj-4', name: 'Personal', status: 'in-progress', priority: 'low', startDate: d(-30), endDate: d(60), description: 'Personal projects and learning', createdAt: ts(-30) },
      { id: 'proj-5', name: 'API v2', status: 'in-progress', priority: 'high', startDate: d(-3), endDate: d(14), description: 'REST API v2 migration', createdAt: ts(-3) },
      // 4 backlog/not-started
      { id: 'proj-6', name: 'Chrome Extension', status: 'backlog', priority: 'medium', startDate: '', endDate: '', description: 'Productivity Chrome extension', createdAt: ts(0) },
      { id: 'proj-7', name: 'Blog Platform', status: 'not-started', priority: 'low', startDate: d(30), endDate: d(90), description: 'Personal blog with MDX', createdAt: ts(0) },
      { id: 'proj-8', name: 'CLI Tool', status: 'backlog', priority: 'medium', startDate: '', endDate: '', description: 'Developer CLI utility', createdAt: ts(0) },
      { id: 'proj-9', name: 'Design System', status: 'not-started', priority: 'high', startDate: d(14), endDate: d(60), description: 'Reusable component library', createdAt: ts(0) },
      // 7 done
      { id: 'proj-10', name: 'Landing Page v1', status: 'done', priority: 'high', startDate: d(-60), endDate: d(-30), description: 'Initial landing page', createdAt: ts(-60) },
      { id: 'proj-11', name: 'Auth System', status: 'done', priority: 'urgent', startDate: d(-45), endDate: d(-20), description: 'JWT authentication', createdAt: ts(-45) },
      { id: 'proj-12', name: 'Database Setup', status: 'done', priority: 'high', startDate: d(-40), endDate: d(-25), description: 'PostgreSQL setup', createdAt: ts(-40) },
      { id: 'proj-13', name: 'CI/CD Pipeline', status: 'done', priority: 'medium', startDate: d(-35), endDate: d(-15), description: 'GitHub Actions workflow', createdAt: ts(-35) },
      { id: 'proj-14', name: 'Email Service', status: 'done', priority: 'medium', startDate: d(-30), endDate: d(-10), description: 'Transactional emails', createdAt: ts(-30) },
      { id: 'proj-15', name: 'Analytics Setup', status: 'done', priority: 'low', startDate: d(-25), endDate: d(-8), description: 'Plausible analytics', createdAt: ts(-25) },
      { id: 'proj-16', name: 'SEO Optimization', status: 'done', priority: 'medium', startDate: d(-20), endDate: d(-5), description: 'Meta tags and sitemap', createdAt: ts(-20) },
    ],
    reminders: [
      { id: 'rem-1', title: 'Team stand-up', description: 'Daily sync with the engineering team', datetime: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(), done: false, createdAt: ts(0) },
      { id: 'rem-2', title: 'Submit weekly report', description: 'Send progress update to stakeholders', datetime: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(), done: false, createdAt: ts(0) },
      { id: 'rem-3', title: 'Doctor Appointment', description: 'Annual checkup', datetime: new Date(new Date(Date.now() + 86400000).setHours(11, 30, 0, 0)).toISOString(), done: false, createdAt: ts(0) },
    ],
    quickLinks: [
      { id: 'link-1', name: 'Notion', url: 'https://notion.so', favicon: 'https://www.google.com/s2/favicons?domain=notion.so&sz=64', createdAt: ts(0) },
      { id: 'link-2', name: 'Gmail', url: 'https://mail.google.com', favicon: 'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64', createdAt: ts(0) },
      { id: 'link-3', name: 'Google Calendar', url: 'https://calendar.google.com', favicon: 'https://www.google.com/s2/favicons?domain=calendar.google.com&sz=64', createdAt: ts(0) },
      { id: 'link-4', name: 'GitHub', url: 'https://github.com', favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64', createdAt: ts(0) },
      { id: 'link-5', name: 'Figma', url: 'https://figma.com', favicon: 'https://www.google.com/s2/favicons?domain=figma.com&sz=64', createdAt: ts(0) },
      { id: 'link-6', name: 'YouTube', url: 'https://youtube.com', favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64', createdAt: ts(0) },
      { id: 'link-7', name: 'Linear', url: 'https://linear.app', favicon: 'https://www.google.com/s2/favicons?domain=linear.app&sz=64', createdAt: ts(0) },
    ],
    settings: {
      font: 'sf-pro',
      fontSize: 'default',
      theme: 'auto',
      groqApiKey: '',
      notifications: false,
      quickLinksView: 'gallery'
    },
    stats: {
      streakDays: 5,
      lastActiveDate: new Date().toISOString().split('T')[0],
      dailyCompletions: {} // date -> count
    }
  };

  // ============================================
  // Storage keys
  // ============================================
  const KEYS = {
    tasks: 'cc_tasks',
    projects: 'cc_projects',
    reminders: 'cc_reminders',
    quickLinks: 'cc_quicklinks',
    settings: 'cc_settings',
    stats: 'cc_stats',
    initialized: 'cc_initialized_v2'
  };

  // ============================================
  // Initialize store
  // ============================================
  function init() {
    if (!localStorage.getItem(KEYS.initialized)) {
      // First run - seed with sample data
      localStorage.setItem(KEYS.tasks, JSON.stringify(SEED_DATA.tasks));
      localStorage.setItem(KEYS.projects, JSON.stringify(SEED_DATA.projects));
      localStorage.setItem(KEYS.reminders, JSON.stringify(SEED_DATA.reminders));
      localStorage.setItem(KEYS.quickLinks, JSON.stringify(SEED_DATA.quickLinks));
      localStorage.setItem(KEYS.settings, JSON.stringify(SEED_DATA.settings));
      localStorage.setItem(KEYS.stats, JSON.stringify(SEED_DATA.stats));
      localStorage.setItem(KEYS.initialized, 'true');
    }
  }

  // ============================================
  // Generic CRUD helpers
  // ============================================
  function getAll(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  function saveAll(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  // ============================================
  // Tasks
  // ============================================
  const tasks = {
    getAll() { return getAll(KEYS.tasks); },

    getById(id) {
      return this.getAll().find(t => t.id === id) || null;
    },

    add(taskData) {
      const tasks = this.getAll();
      const task = {
        id: generateId('task'),
        name: taskData.name || 'Untitled Task',
        status: taskData.status || 'not-started',
        priority: taskData.priority || 'medium',
        energy: taskData.energy || 'medium',
        startDate: taskData.startDate || '',
        endDate: taskData.endDate || '',
        projectId: taskData.projectId || '',
        notes: taskData.notes || '',
        createdAt: new Date().toISOString(),
        completedAt: null
      };
      tasks.push(task);
      saveAll(KEYS.tasks, tasks);
      return task;
    },

    update(id, updates) {
      const tasks = this.getAll();
      const idx = tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;

      // Track completion time
      if (updates.status === 'done' && tasks[idx].status !== 'done') {
        updates.completedAt = new Date().toISOString();
        // Update stats (use local stats reference to avoid circular dependency)
        stats.recordCompletion();
      } else if (updates.status && updates.status !== 'done') {
        updates.completedAt = null;
      }

      tasks[idx] = { ...tasks[idx], ...updates };
      saveAll(KEYS.tasks, tasks);
      return tasks[idx];
    },

    delete(id) {
      const tasks = this.getAll().filter(t => t.id !== id);
      saveAll(KEYS.tasks, tasks);
    },

    getByStatus(status) {
      return this.getAll().filter(t => t.status === status);
    },

    getByProject(projectId) {
      return this.getAll().filter(t => t.projectId === projectId);
    },

    getCompletedToday() {
      const today = new Date().toISOString().split('T')[0];
      return this.getAll().filter(t =>
        t.completedAt && t.completedAt.startsWith(today)
      );
    },

    getOverdue() {
      const today = new Date().toISOString().split('T')[0];
      return this.getAll().filter(t =>
        t.endDate && t.endDate < today && t.status !== 'done'
      );
    }
  };

  // ============================================
  // Projects
  // ============================================
  const projects = {
    getAll() { return getAll(KEYS.projects); },

    getById(id) {
      return this.getAll().find(p => p.id === id) || null;
    },

    add(projectData) {
      const projects = this.getAll();
      const project = {
        id: generateId('proj'),
        name: projectData.name || 'Untitled Project',
        status: projectData.status || 'not-started',
        priority: projectData.priority || 'medium',
        startDate: projectData.startDate || '',
        endDate: projectData.endDate || '',
        description: projectData.description || '',
        createdAt: new Date().toISOString()
      };
      projects.push(project);
      saveAll(KEYS.projects, projects);
      return project;
    },

    update(id, updates) {
      const projects = this.getAll();
      const idx = projects.findIndex(p => p.id === id);
      if (idx === -1) return null;
      projects[idx] = { ...projects[idx], ...updates };
      saveAll(KEYS.projects, projects);
      return projects[idx];
    },

    delete(id) {
      const projects = this.getAll().filter(p => p.id !== id);
      saveAll(KEYS.projects, projects);
      // Also remove project reference from tasks
      const allTasks = tasks.getAll();
      const updatedTasks = allTasks.map(t =>
        t.projectId === id ? { ...t, projectId: '' } : t
      );
      saveAll(KEYS.tasks, updatedTasks);
    },

    getTaskCount(projectId) {
      return tasks.getAll().filter(t => t.projectId === projectId).length;
    },

    getCompletedTaskCount(projectId) {
      return tasks.getAll().filter(t =>
        t.projectId === projectId && t.status === 'done'
      ).length;
    }
  };

  // ============================================
  // Reminders
  // ============================================
  const reminders = {
    getAll() { return getAll(KEYS.reminders); },

    getById(id) {
      return this.getAll().find(r => r.id === id) || null;
    },

    add(reminderData) {
      const reminders = this.getAll();
      const reminder = {
        id: generateId('rem'),
        title: reminderData.title || 'Reminder',
        description: reminderData.description || '',
        datetime: reminderData.datetime || new Date().toISOString(),
        done: false,
        createdAt: new Date().toISOString()
      };
      reminders.push(reminder);
      saveAll(KEYS.reminders, reminders);
      return reminder;
    },

    update(id, updates) {
      const reminders = this.getAll();
      const idx = reminders.findIndex(r => r.id === id);
      if (idx === -1) return null;
      reminders[idx] = { ...reminders[idx], ...updates };
      saveAll(KEYS.reminders, reminders);
      return reminders[idx];
    },

    delete(id) {
      const reminders = this.getAll().filter(r => r.id !== id);
      saveAll(KEYS.reminders, reminders);
    },

    markDone(id) {
      return this.update(id, { done: true });
    },

    getPending() {
      return this.getAll().filter(r => !r.done);
    },

    getUpcoming() {
      const now = new Date();
      return this.getAll()
        .filter(r => !r.done && new Date(r.datetime) > now)
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    }
  };

  // ============================================
  // Quick Links
  // ============================================
  const quickLinks = {
    getAll() { return getAll(KEYS.quickLinks); },

    getById(id) {
      return this.getAll().find(l => l.id === id) || null;
    },

    add(linkData) {
      const links = this.getAll();
      const link = {
        id: generateId('link'),
        name: linkData.name || 'Link',
        url: linkData.url || '',
        favicon: linkData.favicon || '',
        createdAt: new Date().toISOString()
      };
      links.push(link);
      saveAll(KEYS.quickLinks, links);
      return link;
    },

    update(id, updates) {
      const links = this.getAll();
      const idx = links.findIndex(l => l.id === id);
      if (idx === -1) return null;
      links[idx] = { ...links[idx], ...updates };
      saveAll(KEYS.quickLinks, links);
      return links[idx];
    },

    delete(id) {
      const links = this.getAll().filter(l => l.id !== id);
      saveAll(KEYS.quickLinks, links);
    }
  };

  // ============================================
  // Settings
  // ============================================
  const settings = {
    get() {
      try {
        return JSON.parse(localStorage.getItem(KEYS.settings)) || SEED_DATA.settings;
      } catch {
        return SEED_DATA.settings;
      }
    },

    update(updates) {
      const current = this.get();
      const updated = { ...current, ...updates };
      localStorage.setItem(KEYS.settings, JSON.stringify(updated));
      return updated;
    },

    getSetting(key) {
      return this.get()[key];
    }
  };

  // ============================================
  // Stats
  // ============================================
  const stats = {
    get() {
      try {
        return JSON.parse(localStorage.getItem(KEYS.stats)) || SEED_DATA.stats;
      } catch {
        return SEED_DATA.stats;
      }
    },

    save(data) {
      localStorage.setItem(KEYS.stats, JSON.stringify(data));
    },

    recordCompletion() {
      const data = this.get();
      const today = new Date().toISOString().split('T')[0];
      data.dailyCompletions[today] = (data.dailyCompletions[today] || 0) + 1;

      // Update streak
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (data.lastActiveDate === yesterday || data.lastActiveDate === today) {
        if (data.lastActiveDate !== today) {
          data.streakDays = (data.streakDays || 0) + 1;
        }
      } else if (data.lastActiveDate !== today) {
        data.streakDays = 1;
      }
      data.lastActiveDate = today;
      this.save(data);
    },

    getWeeklyData() {
      const data = this.get();
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const completed = data.dailyCompletions[dateStr] || 0;
        // Count total tasks due that day
        const total = tasks.getAll().filter(t =>
          t.endDate === dateStr || t.startDate === dateStr
        ).length;
        result.push({ date: dateStr, day: dayName, completed, total: Math.max(total, completed) });
      }
      return result;
    },

    getCompletionRate() {
      const today = new Date().toISOString().split('T')[0];
      const allTasks = tasks.getAll();
      const todayTasks = allTasks.filter(t =>
        t.endDate === today || t.startDate === today
      );
      if (todayTasks.length === 0) return 0;
      const completed = todayTasks.filter(t => t.status === 'done').length;
      return Math.round((completed / todayTasks.length) * 100);
    },

    getOnTimeRate() {
      const allTasks = tasks.getAll();
      const completedTasks = allTasks.filter(t => t.status === 'done' && t.completedAt);
      if (completedTasks.length === 0) return 100;
      const onTime = completedTasks.filter(t => {
        if (!t.endDate) return true;
        return t.completedAt.split('T')[0] <= t.endDate;
      }).length;
      return Math.round((onTime / completedTasks.length) * 100);
    }
  };

  // ============================================
  // Search
  // ============================================
  const search = {
    query(q) {
      if (!q || q.trim().length < 2) return { tasks: [], projects: [], links: [] };
      const lower = q.toLowerCase();

      const matchedTasks = tasks.getAll().filter(t =>
        t.name.toLowerCase().includes(lower) ||
        (t.notes && t.notes.toLowerCase().includes(lower))
      ).slice(0, 5);

      const matchedProjects = projects.getAll().filter(p =>
        p.name.toLowerCase().includes(lower) ||
        (p.description && p.description.toLowerCase().includes(lower))
      ).slice(0, 3);

      const matchedLinks = quickLinks.getAll().filter(l =>
        l.name.toLowerCase().includes(lower) ||
        l.url.toLowerCase().includes(lower)
      ).slice(0, 3);

      return { tasks: matchedTasks, projects: matchedProjects, links: matchedLinks };
    }
  };

  // Initialize on load
  init();

  return { tasks, projects, reminders, quickLinks, settings, stats, search, generateId };
})();
