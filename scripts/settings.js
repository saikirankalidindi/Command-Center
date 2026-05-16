/**
 * settings.js - Settings page
 */

const Settings = (() => {

  function render(container) {
    const settings = Store.settings.get();

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
      </div>

      <div class="settings-layout">
        <!-- Settings Nav -->
        <nav class="settings-nav">
          <div class="settings-nav-item active" data-section="appearance">
            ${Utils.icons.dashboard} Appearance
          </div>
          <div class="settings-nav-item" data-section="ai">
            ${Utils.icons.ai} AI & Search
          </div>
          <div class="settings-nav-item" data-section="notifications">
            ${Utils.icons.reminders} Notifications
          </div>
          <div class="settings-nav-item" data-section="data">
            ${Utils.icons.stats} Data
          </div>
        </nav>

        <!-- Settings Content -->
        <div id="settings-content">
          ${renderAppearanceSection(settings)}
          ${renderAISection(settings)}
          ${renderNotificationsSection(settings)}
          ${renderDataSection()}
        </div>
      </div>
    `;

    // Nav switching
    container.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        container.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        container.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        const section = container.querySelector(`#settings-${item.dataset.section}`);
        if (section) section.classList.add('active');
      });
    });

    bindAppearanceHandlers(container);
    bindAIHandlers(container);
    bindNotificationHandlers(container);
    bindDataHandlers(container);
  }

  // ============================================
  // Appearance Section
  // ============================================
  function renderAppearanceSection(settings) {
    return `
      <div class="settings-section active" id="settings-appearance">
        <div class="settings-section-title">Appearance</div>
        <div class="settings-section-desc">Customize how the dashboard looks and feels.</div>

        <!-- Theme -->
        <div class="settings-group">
          <div class="settings-group-title">Theme</div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Color Theme</div>
              <div class="settings-row-desc">Choose between light, dark, or system preference</div>
            </div>
            <div class="settings-row-control">
              <div class="theme-options">
                <div class="theme-option ${settings.theme === 'auto' ? 'selected' : ''}" data-theme="auto">
                  <div class="theme-preview"><div class="theme-preview-auto"></div></div>
                  <div class="theme-option-name">Auto</div>
                </div>
                <div class="theme-option ${settings.theme === 'light' ? 'selected' : ''}" data-theme="light">
                  <div class="theme-preview"><div class="theme-preview-light"></div></div>
                  <div class="theme-option-name">Light</div>
                </div>
                <div class="theme-option ${settings.theme === 'dark' ? 'selected' : ''}" data-theme="dark">
                  <div class="theme-preview"><div class="theme-preview-dark"></div></div>
                  <div class="theme-option-name">Dark</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Font Family -->
        <div class="settings-group">
          <div class="settings-group-title">Font</div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Font Family</div>
              <div class="settings-row-desc">Choose the typeface for the interface</div>
            </div>
            <div class="settings-row-control">
              <div class="font-options">
                <div class="font-option ${settings.font === 'sf-pro' || !settings.font ? 'selected' : ''}" data-font="sf-pro">
                  <div class="font-option-preview" style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif">Aa</div>
                  <div class="font-option-name">SF Pro</div>
                </div>
                <div class="font-option ${settings.font === 'inter' ? 'selected' : ''}" data-font="inter">
                  <div class="font-option-preview" style="font-family:'Inter',sans-serif">Aa</div>
                  <div class="font-option-name">Inter</div>
                </div>
                <div class="font-option ${settings.font === 'system' ? 'selected' : ''}" data-font="system">
                  <div class="font-option-preview" style="font-family:system-ui,sans-serif">Aa</div>
                  <div class="font-option-name">System</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Font Size -->
        <div class="settings-group">
          <div class="settings-group-title">Text Size</div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Font Size</div>
              <div class="settings-row-desc">Adjust the base text size</div>
            </div>
            <div class="settings-row-control">
              <div class="font-size-options">
                <div class="font-size-option ${settings.fontSize === 'small' ? 'selected' : ''}" data-size="small">
                  <div class="font-size-option-label">Small</div>
                  <div class="font-size-option-px">13px</div>
                </div>
                <div class="font-size-option ${(!settings.fontSize || settings.fontSize === 'default') ? 'selected' : ''}" data-size="default">
                  <div class="font-size-option-label">Default</div>
                  <div class="font-size-option-px">14px</div>
                </div>
                <div class="font-size-option ${settings.fontSize === 'medium' ? 'selected' : ''}" data-size="medium">
                  <div class="font-size-option-label">Medium</div>
                  <div class="font-size-option-px">15px</div>
                </div>
                <div class="font-size-option ${settings.fontSize === 'large' ? 'selected' : ''}" data-size="large">
                  <div class="font-size-option-label">Large</div>
                  <div class="font-size-option-px">17px</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindAppearanceHandlers(container) {
    // Theme
    container.querySelectorAll('.theme-option').forEach(opt => {
      opt.addEventListener('click', () => {
        container.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        const theme = opt.dataset.theme;
        Store.settings.update({ theme });
        applyTheme(theme);
        showSaved(container);
      });
    });

    // Font family
    container.querySelectorAll('.font-option').forEach(opt => {
      opt.addEventListener('click', () => {
        container.querySelectorAll('.font-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        const font = opt.dataset.font;
        Store.settings.update({ font });
        applyFont(font);
        showSaved(container);
      });
    });

    // Font size
    container.querySelectorAll('.font-size-option').forEach(opt => {
      opt.addEventListener('click', () => {
        container.querySelectorAll('.font-size-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        const size = opt.dataset.size;
        Store.settings.update({ fontSize: size });
        applyFontSize(size);
        showSaved(container);
      });
    });
  }

  // ============================================
  // AI Section
  // ============================================
  function renderAISection(settings) {
    const maskedKey = settings.groqApiKey
      ? settings.groqApiKey.slice(0, 8) + '••••••••••••••••' + settings.groqApiKey.slice(-4)
      : '';

    return `
      <div class="settings-section" id="settings-ai">
        <div class="settings-section-title">AI & Search</div>
        <div class="settings-section-desc">Configure AI-powered search using the Groq API.</div>

        <div class="settings-group">
          <div class="settings-group-title">Groq API</div>
          <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:12px">
            <div class="settings-row-info">
              <div class="settings-row-label">API Key</div>
              <div class="settings-row-desc">
                Get your free API key from <a href="https://console.groq.com" target="_blank" rel="noopener">console.groq.com</a>.
                Used for AI-powered search suggestions.
              </div>
            </div>
            <div class="api-key-input-wrapper" style="width:100%">
              <input type="password" id="groq-api-key" placeholder="gsk_..." value="${Utils.escapeHtml(settings.groqApiKey || '')}" />
              <button class="btn btn-secondary btn-sm api-key-toggle" id="toggle-api-key">Show</button>
              <button class="btn btn-primary btn-sm" id="save-api-key">Save</button>
            </div>
            <div id="api-key-status" style="font-size:0.8125rem;color:var(--text-tertiary)">
              ${settings.groqApiKey ? '✓ API key configured' : 'No API key set — AI search disabled'}
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">AI Model</div>
              <div class="settings-row-desc">Model used for search suggestions</div>
            </div>
            <div class="settings-row-control">
              <span style="font-size:0.875rem;color:var(--text-secondary);font-family:monospace">llama3-8b-8192</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindAIHandlers(container) {
    const keyInput = container.querySelector('#groq-api-key');
    const toggleBtn = container.querySelector('#toggle-api-key');
    const saveBtn = container.querySelector('#save-api-key');
    const statusEl = container.querySelector('#api-key-status');

    if (!keyInput) return;

    toggleBtn.addEventListener('click', () => {
      if (keyInput.type === 'password') {
        keyInput.type = 'text';
        toggleBtn.textContent = 'Hide';
      } else {
        keyInput.type = 'password';
        toggleBtn.textContent = 'Show';
      }
    });

    saveBtn.addEventListener('click', () => {
      const key = keyInput.value.trim();
      Store.settings.update({ groqApiKey: key });
      statusEl.textContent = key ? '✓ API key saved' : 'No API key set — AI search disabled';
      statusEl.style.color = key ? '#1a7f37' : 'var(--text-tertiary)';
      Utils.toast('API key saved', 'success');
    });
  }

  // ============================================
  // Notifications Section
  // ============================================
  function renderNotificationsSection(settings) {
    return `
      <div class="settings-section" id="settings-notifications">
        <div class="settings-section-title">Notifications</div>
        <div class="settings-section-desc">Manage how you receive reminders and alerts.</div>

        <div class="settings-group">
          <div class="settings-group-title">Push Notifications</div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Browser Notifications</div>
              <div class="settings-row-desc">Receive push notifications for reminders in your browser</div>
            </div>
            <div class="settings-row-control">
              <label class="toggle">
                <input type="checkbox" id="notifications-toggle" ${settings.notifications ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Notification Status</div>
              <div class="settings-row-desc" id="notif-permission-status">
                ${getNotificationPermissionText()}
              </div>
            </div>
            <div class="settings-row-control">
              <button class="btn btn-secondary btn-sm" id="request-notif-permission">
                Request Permission
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function getNotificationPermissionText() {
    if (!('Notification' in window)) return 'Notifications not supported in this browser';
    const perm = Notification.permission;
    if (perm === 'granted') return '✓ Notifications are allowed';
    if (perm === 'denied') return '✗ Notifications are blocked — please enable in browser settings';
    return 'Notifications permission not yet requested';
  }

  function bindNotificationHandlers(container) {
    const toggle = container.querySelector('#notifications-toggle');
    const requestBtn = container.querySelector('#request-notif-permission');
    const statusEl = container.querySelector('#notif-permission-status');

    if (!toggle) return;

    toggle.addEventListener('change', async () => {
      if (toggle.checked) {
        if ('Notification' in window && Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') {
            toggle.checked = false;
            Utils.toast('Notification permission denied', 'error');
            return;
          }
        }
        Store.settings.update({ notifications: true });
        Utils.toast('Notifications enabled 🔔', 'success');
      } else {
        Store.settings.update({ notifications: false });
        Utils.toast('Notifications disabled', 'info');
      }
      if (statusEl) statusEl.textContent = getNotificationPermissionText();
    });

    requestBtn.addEventListener('click', async () => {
      if (!('Notification' in window)) {
        Utils.toast('Notifications not supported', 'error');
        return;
      }
      const perm = await Notification.requestPermission();
      if (statusEl) statusEl.textContent = getNotificationPermissionText();
      if (perm === 'granted') {
        Utils.toast('Notifications allowed ✓', 'success');
      } else {
        Utils.toast('Permission denied', 'error');
      }
    });
  }

  // ============================================
  // Data Section
  // ============================================
  function renderDataSection() {
    const taskCount = Store.tasks.getAll().length;
    const projectCount = Store.projects.getAll().length;
    const linkCount = Store.quickLinks.getAll().length;
    const reminderCount = Store.reminders.getAll().length;

    return `
      <div class="settings-section" id="settings-data">
        <div class="settings-section-title">Data</div>
        <div class="settings-section-desc">Manage your stored data.</div>

        <div class="settings-group">
          <div class="settings-group-title">Storage Summary</div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Tasks</div>
            </div>
            <div class="settings-row-control">
              <span style="font-size:0.875rem;color:var(--text-secondary)">${taskCount} items</span>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Projects</div>
            </div>
            <div class="settings-row-control">
              <span style="font-size:0.875rem;color:var(--text-secondary)">${projectCount} items</span>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Quick Links</div>
            </div>
            <div class="settings-row-control">
              <span style="font-size:0.875rem;color:var(--text-secondary)">${linkCount} items</span>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Reminders</div>
            </div>
            <div class="settings-row-control">
              <span style="font-size:0.875rem;color:var(--text-secondary)">${reminderCount} items</span>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Export</div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Export Data</div>
              <div class="settings-row-desc">Download all your data as a JSON file</div>
            </div>
            <div class="settings-row-control">
              <button class="btn btn-secondary btn-sm" id="export-data-btn">Export JSON</button>
            </div>
          </div>
        </div>

        <div class="settings-group danger-zone">
          <div class="settings-group-title">Danger Zone</div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Reset All Data</div>
              <div class="settings-row-desc">Delete all tasks, projects, reminders, and links. This cannot be undone.</div>
            </div>
            <div class="settings-row-control">
              <button class="btn btn-danger btn-sm" id="reset-data-btn">Reset Data</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindDataHandlers(container) {
    const exportBtn = container.querySelector('#export-data-btn');
    const resetBtn = container.querySelector('#reset-data-btn');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = {
          tasks: Store.tasks.getAll(),
          projects: Store.projects.getAll(),
          reminders: Store.reminders.getAll(),
          quickLinks: Store.quickLinks.getAll(),
          settings: Store.settings.get(),
          exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `command-center-export-${Utils.today()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Utils.toast('Data exported', 'success');
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset ALL data? This cannot be undone.')) {
          if (confirm('This will permanently delete all your tasks, projects, reminders, and links. Continue?')) {
            localStorage.clear();
            Utils.toast('All data reset. Reloading...', 'error');
            setTimeout(() => window.location.reload(), 1500);
          }
        }
      });
    }
  }

  // ============================================
  // Apply settings to DOM
  // ============================================
  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      html.removeAttribute('data-theme');
    } else {
      // Auto - use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        html.setAttribute('data-theme', 'dark');
      } else {
        html.removeAttribute('data-theme');
      }
    }
  }

  function applyFont(font) {
    const html = document.documentElement;
    html.removeAttribute('data-font');
    if (font && font !== 'sf-pro') {
      html.setAttribute('data-font', font);
    }
  }

  function applyFontSize(size) {
    const html = document.documentElement;
    html.removeAttribute('data-font-size');
    if (size && size !== 'default') {
      html.setAttribute('data-font-size', size);
    }
  }

  function applyAllSettings() {
    const settings = Store.settings.get();
    applyTheme(settings.theme || 'auto');
    applyFont(settings.font || 'sf-pro');
    applyFontSize(settings.fontSize || 'default');
  }

  function showSaved(container) {
    // Brief visual feedback
    const existing = container.querySelector('.settings-saved-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.className = 'settings-saved-indicator';
    indicator.innerHTML = `${Utils.icons.check} Saved`;
    indicator.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a7f37;color:white;padding:8px 16px;border-radius:8px;font-size:0.875rem;z-index:9999;animation:slideUp 0.2s ease';
    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 2000);
  }

  return { render, applyAllSettings };
})();
