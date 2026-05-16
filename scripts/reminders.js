/**
 * reminders.js - Reminders modal
 */

const Reminders = (() => {
  let checkInterval = null;

  /**
   * Open the reminders modal
   */
  function openModal() {
    // Remove existing modal if any
    const existing = document.getElementById('reminders-modal');
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'reminders-modal';

    overlay.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:1.25rem">🔔</span>
            <h3 class="modal-title">Reminders</h3>
            <span class="badge" style="background:var(--accent-light);color:var(--accent)" id="reminder-count-badge">
              ${Store.reminders.getPending().length} pending
            </span>
          </div>
          <button class="btn-icon" id="close-reminders-modal">${Utils.icons.close}</button>
        </div>
        <div class="modal-body" style="padding:16px 24px">
          <div id="reminders-list-container"></div>
          <div class="add-reminder-form" id="add-reminder-form-section">
            <div class="add-reminder-toggle" id="toggle-add-reminder">
              ${Utils.icons.plus} Add reminder
            </div>
            <div id="add-reminder-fields" class="hidden">
              <div class="form-group mt-2">
                <label>Title *</label>
                <input type="text" id="reminder-title" placeholder="Reminder title" />
              </div>
              <div class="form-group">
                <label>Description</label>
                <input type="text" id="reminder-desc" placeholder="Optional description" />
              </div>
              <div class="form-group">
                <label>Date & Time *</label>
                <input type="datetime-local" id="reminder-datetime" value="${getDefaultDatetime()}" />
              </div>
              <div style="display:flex;gap:8px;margin-top:8px">
                <button class="btn btn-primary btn-sm" id="save-reminder-btn">Add Reminder</button>
                <button class="btn btn-secondary btn-sm" id="cancel-reminder-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Render list
    renderRemindersList(overlay.querySelector('#reminders-list-container'));

    // Close
    const close = () => overlay.remove();
    overlay.querySelector('#close-reminders-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // Toggle add form
    overlay.querySelector('#toggle-add-reminder').addEventListener('click', () => {
      const fields = overlay.querySelector('#add-reminder-fields');
      fields.classList.toggle('hidden');
      if (!fields.classList.contains('hidden')) {
        overlay.querySelector('#reminder-title').focus();
      }
    });

    overlay.querySelector('#cancel-reminder-btn').addEventListener('click', () => {
      overlay.querySelector('#add-reminder-fields').classList.add('hidden');
    });

    // Save reminder
    overlay.querySelector('#save-reminder-btn').addEventListener('click', () => {
      const title = overlay.querySelector('#reminder-title').value.trim();
      const desc = overlay.querySelector('#reminder-desc').value.trim();
      const datetime = overlay.querySelector('#reminder-datetime').value;

      if (!title) {
        overlay.querySelector('#reminder-title').focus();
        overlay.querySelector('#reminder-title').style.borderColor = '#dc2626';
        return;
      }

      if (!datetime) {
        overlay.querySelector('#reminder-datetime').focus();
        return;
      }

      Store.reminders.add({
        title,
        description: desc,
        datetime: new Date(datetime).toISOString()
      });

      Utils.toast('Reminder added 🔔', 'success');

      // Reset form
      overlay.querySelector('#reminder-title').value = '';
      overlay.querySelector('#reminder-desc').value = '';
      overlay.querySelector('#reminder-datetime').value = getDefaultDatetime();
      overlay.querySelector('#add-reminder-fields').classList.add('hidden');

      // Re-render list
      renderRemindersList(overlay.querySelector('#reminders-list-container'));
      updateBadge(overlay);
    });
  }

  /**
   * Render the reminders list
   */
  function renderRemindersList(container) {
    const reminders = Store.reminders.getAll()
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    if (reminders.length === 0) {
      container.innerHTML = `
        <div class="reminders-empty">
          <div class="reminders-empty-icon">🔔</div>
          <p>No reminders yet. Add one below!</p>
        </div>
      `;
      return;
    }

    const list = document.createElement('div');
    list.className = 'reminders-list';

    reminders.forEach(reminder => {
      const item = createReminderItem(reminder, container);
      list.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(list);
  }

  function createReminderItem(reminder, listContainer) {
    const item = document.createElement('div');
    item.className = `reminder-item ${reminder.done ? 'done' : ''}`;
    item.dataset.id = reminder.id;

    const now = new Date();
    const reminderTime = new Date(reminder.datetime);
    const isOverdue = !reminder.done && reminderTime < now;
    const isUpcoming = !reminder.done && reminderTime > now && (reminderTime - now) < 3600000;

    let timeClass = '';
    if (isOverdue) timeClass = 'overdue';
    else if (isUpcoming) timeClass = 'upcoming';

    item.innerHTML = `
      <div class="reminder-check ${reminder.done ? 'checked' : ''}" data-id="${reminder.id}">
        ${reminder.done ? Utils.icons.check : ''}
      </div>
      <div class="reminder-content">
        <div class="reminder-title">${Utils.escapeHtml(reminder.title)}</div>
        ${reminder.description ? `<div class="reminder-description">${Utils.escapeHtml(reminder.description)}</div>` : ''}
        <div class="reminder-time ${timeClass}">
          ${Utils.icons.calendar}
          ${Utils.formatDateTime(reminder.datetime)}
          ${isOverdue ? ' · Overdue' : ''}
          ${isUpcoming ? ' · Soon' : ''}
        </div>
      </div>
      <div class="reminder-actions">
        <button class="btn-icon delete-reminder-btn" data-id="${reminder.id}" title="Delete" style="color:#dc2626">
          ${Utils.icons.trash}
        </button>
      </div>
    `;

    // Toggle done
    item.querySelector('.reminder-check').addEventListener('click', () => {
      Store.reminders.update(reminder.id, { done: !reminder.done });
      renderRemindersList(listContainer);
      updateBadgeGlobal();
    });

    // Delete
    item.querySelector('.delete-reminder-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      Store.reminders.delete(reminder.id);
      renderRemindersList(listContainer);
      updateBadgeGlobal();
      Utils.toast('Reminder deleted', 'error');
    });

    return item;
  }

  function updateBadge(overlay) {
    const badge = overlay.querySelector('#reminder-count-badge');
    if (badge) {
      badge.textContent = `${Store.reminders.getPending().length} pending`;
    }
    updateBadgeGlobal();
  }

  function updateBadgeGlobal() {
    const pending = Store.reminders.getPending().length;
    const navBadge = document.querySelector('.nav-item[data-route="reminders"] .nav-badge');
    if (navBadge) {
      navBadge.textContent = pending;
      navBadge.style.display = pending > 0 ? '' : 'none';
    }
  }

  function getDefaultDatetime() {
    const d = new Date(Date.now() + 3600000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  }

  /**
   * Start checking for due reminders
   */
  function startReminderCheck() {
    updateBadgeGlobal();

    checkInterval = setInterval(() => {
      const upcoming = Store.reminders.getUpcoming();
      const now = new Date();

      upcoming.forEach(reminder => {
        const reminderTime = new Date(reminder.datetime);
        const diff = reminderTime - now;

        // Trigger notification within 1 minute window
        if (diff >= 0 && diff <= 60000) {
          triggerReminderNotification(reminder);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Trigger a reminder notification
   */
  function triggerReminderNotification(reminder) {
    // Browser notification
    const settings = Store.settings.get();
    if (settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(reminder.title, {
        body: reminder.description || 'Reminder',
        icon: '/favicon.ico'
      });
    }

    // In-app notification
    showInAppNotification(reminder);
  }

  function showInAppNotification(reminder) {
    const existing = document.querySelector('.reminder-notification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.className = 'reminder-notification';
    notif.innerHTML = `
      <div class="reminder-notification-header">
        <div class="reminder-notification-icon">🔔</div>
        <div>
          <div class="reminder-notification-title">${Utils.escapeHtml(reminder.title)}</div>
        </div>
        <button class="btn-icon" id="close-notif" style="margin-left:auto">${Utils.icons.close}</button>
      </div>
      ${reminder.description ? `<div class="reminder-notification-body">${Utils.escapeHtml(reminder.description)}</div>` : ''}
      <div class="reminder-notification-actions">
        <button class="btn btn-primary btn-sm" id="notif-done-btn">Mark Done</button>
        <button class="btn btn-secondary btn-sm" id="notif-dismiss-btn">Dismiss</button>
      </div>
    `;

    document.body.appendChild(notif);

    notif.querySelector('#close-notif').addEventListener('click', () => notif.remove());
    notif.querySelector('#notif-dismiss-btn').addEventListener('click', () => notif.remove());
    notif.querySelector('#notif-done-btn').addEventListener('click', () => {
      Store.reminders.markDone(reminder.id);
      updateBadgeGlobal();
      notif.remove();
      Utils.toast('Reminder completed ✓', 'success');
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (notif.parentNode) notif.remove();
    }, 10000);
  }

  return { openModal, startReminderCheck, updateBadgeGlobal };
})();
