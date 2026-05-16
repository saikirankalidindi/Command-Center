/**
 * tasks.js - Tasks page rendering and interactions
 */

const Tasks = (() => {
  let currentView = 'table'; // table | kanban | calendar
  let sortField = 'name';
  let sortDir = 'asc';
  let filterStatus = 'all';
  let calendarDate = new Date();
  let draggedTaskId = null;

  // ============================================
  // Main render
  // ============================================
  function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Tasks</h1>
        <button class="btn btn-primary" id="add-task-btn">
          ${Utils.icons.plus} Add Task
        </button>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
        <div class="view-tabs" id="task-view-tabs">
          <button class="view-tab ${currentView === 'table' ? 'active' : ''}" data-view="table">
            ${Utils.icons.table} Table
          </button>
          <button class="view-tab ${currentView === 'kanban' ? 'active' : ''}" data-view="kanban">
            ${Utils.icons.kanban} Kanban
          </button>
          <button class="view-tab ${currentView === 'calendar' ? 'active' : ''}" data-view="calendar">
            ${Utils.icons.calendar} Calendar
          </button>
        </div>
        <div class="filter-bar" id="task-filter-bar">
          ${renderFilterChips()}
        </div>
      </div>

      <div id="task-view-content"></div>
    `;

    // Bind view tabs
    container.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentView = tab.dataset.view;
        container.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderView(container.querySelector('#task-view-content'));
      });
    });

    // Bind filter chips
    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        filterStatus = chip.dataset.status;
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderView(container.querySelector('#task-view-content'));
      });
    });

    // Add task button
    container.querySelector('#add-task-btn').addEventListener('click', () => {
      showTaskModal(null, () => render(container));
    });

    renderView(container.querySelector('#task-view-content'));
  }

  function renderFilterChips() {
    const statuses = [
      { value: 'all', label: 'All' },
      { value: 'not-started', label: 'Not Started' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'done', label: 'Done' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'backlog', label: 'Backlog' }
    ];
    return statuses.map(s => `
      <button class="filter-chip ${filterStatus === s.value ? 'active' : ''}" data-status="${s.value}">
        ${s.label}
      </button>
    `).join('');
  }

  function getFilteredTasks() {
    const all = Store.tasks.getAll();
    if (filterStatus === 'all') return all;
    return all.filter(t => t.status === filterStatus);
  }

  function renderView(container) {
    if (!container) return;
    container.innerHTML = '';
    if (currentView === 'table') renderTableView(container);
    else if (currentView === 'kanban') renderKanbanView(container);
    else if (currentView === 'calendar') renderCalendarView(container);
  }

  // ============================================
  // Table View
  // ============================================
  let selectedTaskIds = new Set();

  function renderTableView(container) {
    const tasks = getFilteredTasks();

    tasks.sort((a, b) => {
      let va = a[sortField] || '', vb = b[sortField] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tasks-table-wrapper';

    if (tasks.length === 0) {
      wrapper.innerHTML = `<div class="empty-state">${Utils.icons.tasks}<p>No tasks found. Add your first task!</p></div>`;
      container.appendChild(wrapper);
      return;
    }

    // Bulk action bar
    const bulkBar = document.createElement('div');
    bulkBar.className = 'bulk-action-bar';
    bulkBar.id = 'task-bulk-bar';
    bulkBar.style.display = 'none';
    bulkBar.innerHTML = `
      <span class="bulk-count" id="task-bulk-count">0 selected</span>
      <div class="bulk-actions">
        <select class="bulk-status-select" id="task-bulk-status">
          <option value="">Change status…</option>
          ${['not-started','in-progress','done','blocked','backlog'].map(s =>
            `<option value="${s}">${s.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>`
          ).join('')}
        </select>
        <button class="btn btn-danger btn-sm" id="task-bulk-delete">
          ${Utils.icons.trash} Delete selected
        </button>
        <button class="btn btn-secondary btn-sm" id="task-bulk-clear">Clear</button>
      </div>
    `;
    container.appendChild(bulkBar);

    const table = document.createElement('table');
    table.className = 'tasks-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th style="width:36px">
        <input type="checkbox" id="task-select-all" title="Select all" style="width:14px;height:14px;cursor:pointer;accent-color:var(--accent)" />
      </th>
      <th data-field="name" class="${sortField==='name'?'sorted':''}">Name <span class="sort-icon">${sortField==='name'?(sortDir==='asc'?'↑':'↓'):'↕'}</span></th>
      <th data-field="status" class="${sortField==='status'?'sorted':''}">Status <span class="sort-icon">${sortField==='status'?(sortDir==='asc'?'↑':'↓'):'↕'}</span></th>
      <th data-field="priority" class="${sortField==='priority'?'sorted':''}">Priority <span class="sort-icon">${sortField==='priority'?(sortDir==='asc'?'↑':'↓'):'↕'}</span></th>
      <th data-field="energy" class="${sortField==='energy'?'sorted':''}">Energy <span class="sort-icon">${sortField==='energy'?(sortDir==='asc'?'↑':'↓'):'↕'}</span></th>
      <th data-field="endDate" class="${sortField==='endDate'?'sorted':''}">Due Date <span class="sort-icon">${sortField==='endDate'?(sortDir==='asc'?'↑':'↓'):'↕'}</span></th>
      <th data-field="projectId" class="${sortField==='projectId'?'sorted':''}">Project <span class="sort-icon">${sortField==='projectId'?(sortDir==='asc'?'↑':'↓'):'↕'}</span></th>
      <th style="width:80px"></th>
    </tr>`;
    table.appendChild(thead);

    thead.querySelectorAll('th[data-field]').forEach(th => {
      th.addEventListener('click', () => {
        sortField = th.dataset.field;
        sortDir = sortField === th.dataset.field && sortDir === 'asc' ? 'desc' : 'asc';
        sortField = th.dataset.field;
        renderView(container);
      });
    });

    // Select all
    const selectAllCb = thead.querySelector('#task-select-all');
    selectAllCb.addEventListener('change', () => {
      if (selectAllCb.checked) {
        tasks.forEach(t => selectedTaskIds.add(t.id));
      } else {
        selectedTaskIds.clear();
      }
      updateBulkBar(bulkBar, tasks);
      tbody.querySelectorAll('.task-row-cb').forEach(cb => { cb.checked = selectAllCb.checked; });
      tbody.querySelectorAll('tr').forEach(tr => tr.classList.toggle('selected', selectAllCb.checked));
    });

    const tbody = document.createElement('tbody');
    tasks.forEach(task => {
      const tr = document.createElement('tr');
      if (selectedTaskIds.has(task.id)) tr.classList.add('selected');
      const project = task.projectId ? Store.projects.getById(task.projectId) : null;
      const isOverdue = Utils.isOverdue(task.endDate) && task.status !== 'done';

      tr.innerHTML = `
        <td onclick="event.stopPropagation()">
          <input type="checkbox" class="task-row-cb" data-id="${task.id}" ${selectedTaskIds.has(task.id)?'checked':''} style="width:14px;height:14px;cursor:pointer;accent-color:var(--accent)" />
        </td>
        <td>
          <div class="task-name-cell">
            <div class="task-checkbox ${task.status==='done'?'checked':''}" data-id="${task.id}">
              ${task.status==='done'?Utils.icons.check:''}
            </div>
            <span class="task-name-text ${task.status==='done'?'done':''}">${Utils.escapeHtml(task.name)}</span>
          </div>
        </td>
        <td>${Utils.statusBadge(task.status)}</td>
        <td>${Utils.priorityBadge(task.priority)}</td>
        <td>${Utils.energyBadge(task.energy)}</td>
        <td><span style="font-size:0.8125rem;color:${isOverdue?'#dc2626':'var(--text-secondary)'}">
          ${task.endDate?Utils.formatDate(task.endDate):'—'}${isOverdue?' ⚠':''}
        </span></td>
        <td><span style="font-size:0.8125rem;color:var(--text-secondary)">${project?Utils.escapeHtml(project.name):'—'}</span></td>
        <td>
          <div class="task-actions">
            <button class="btn-icon edit-task-btn" data-id="${task.id}" title="Edit">${Utils.icons.edit}</button>
            <button class="btn-icon delete-task-btn" data-id="${task.id}" title="Delete" style="color:#dc2626">${Utils.icons.trash}</button>
          </div>
        </td>
      `;

      // Row checkbox
      tr.querySelector('.task-row-cb').addEventListener('change', (e) => {
        if (e.target.checked) selectedTaskIds.add(task.id);
        else selectedTaskIds.delete(task.id);
        tr.classList.toggle('selected', e.target.checked);
        updateBulkBar(bulkBar, tasks);
        selectAllCb.checked = tasks.every(t => selectedTaskIds.has(t.id));
        selectAllCb.indeterminate = selectedTaskIds.size > 0 && !selectAllCb.checked;
      });

      tr.querySelector('.task-checkbox').addEventListener('click', (e) => {
        e.stopPropagation();
        const newStatus = task.status === 'done' ? 'not-started' : 'done';
        Store.tasks.update(task.id, { status: newStatus });
        Utils.toast(newStatus === 'done' ? 'Task completed! ✓' : 'Task reopened', 'success');
        renderView(container);
      });
      tr.querySelector('.edit-task-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showTaskModal(task, () => renderView(container));
      });
      tr.querySelector('.delete-task-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${task.name}"?`)) {
          Store.tasks.delete(task.id);
          selectedTaskIds.delete(task.id);
          Utils.toast('Task deleted', 'error');
          renderView(container);
        }
      });
      tr.querySelector('.task-name-text').addEventListener('click', () => {
        showTaskModal(task, () => renderView(container));
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);

    // Bulk bar actions
    bulkBar.querySelector('#task-bulk-status').addEventListener('change', (e) => {
      const status = e.target.value;
      if (!status) return;
      selectedTaskIds.forEach(id => Store.tasks.update(id, { status }));
      Utils.toast(`Updated ${selectedTaskIds.size} tasks to "${status}"`, 'success');
      selectedTaskIds.clear();
      e.target.value = '';
      renderView(container);
    });
    bulkBar.querySelector('#task-bulk-delete').addEventListener('click', () => {
      if (!confirm(`Delete ${selectedTaskIds.size} selected tasks?`)) return;
      selectedTaskIds.forEach(id => Store.tasks.delete(id));
      Utils.toast(`Deleted ${selectedTaskIds.size} tasks`, 'error');
      selectedTaskIds.clear();
      renderView(container);
    });
    bulkBar.querySelector('#task-bulk-clear').addEventListener('click', () => {
      selectedTaskIds.clear();
      renderView(container);
    });

    updateBulkBar(bulkBar, tasks);
  }

  function updateBulkBar(bar, tasks) {
    const count = selectedTaskIds.size;
    bar.style.display = count > 0 ? 'flex' : 'none';
    const countEl = bar.querySelector('#task-bulk-count');
    if (countEl) countEl.textContent = `${count} selected`;
  }

  // ============================================
  // Kanban View
  // ============================================
  function renderKanbanView(container) {
    const columns = [
      { status: 'backlog', label: 'Backlog', dotClass: 'dot-backlog' },
      { status: 'not-started', label: 'Not Started', dotClass: 'dot-not-started' },
      { status: 'in-progress', label: 'In Progress', dotClass: 'dot-in-progress' },
      { status: 'blocked', label: 'Blocked', dotClass: 'dot-blocked' },
      { status: 'done', label: 'Done', dotClass: 'dot-done' }
    ];

    const board = document.createElement('div');
    board.className = 'kanban-board';

    const allTasks = Store.tasks.getAll();

    columns.forEach(col => {
      const tasks = allTasks.filter(t => t.status === col.status);

      const column = document.createElement('div');
      column.className = 'kanban-column';
      column.dataset.status = col.status;

      column.innerHTML = `
        <div class="kanban-column-header">
          <div class="kanban-column-title">
            <span class="kanban-column-dot ${col.dotClass}"></span>
            ${col.label}
          </div>
          <span class="kanban-column-count">${tasks.length}</span>
        </div>
        <div class="kanban-cards" id="kanban-col-${col.status}"></div>
        <div class="kanban-add-card" data-status="${col.status}">
          ${Utils.icons.plus} Add task
        </div>
      `;

      const cardsContainer = column.querySelector('.kanban-cards');

      // Render cards
      tasks.forEach(task => {
        const card = createKanbanCard(task);
        cardsContainer.appendChild(card);
      });

      // Drag over
      cardsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        cardsContainer.classList.add('drag-over');
      });

      cardsContainer.addEventListener('dragleave', () => {
        cardsContainer.classList.remove('drag-over');
      });

      cardsContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        cardsContainer.classList.remove('drag-over');
        if (draggedTaskId) {
          Store.tasks.update(draggedTaskId, { status: col.status });
          draggedTaskId = null;
          renderView(container);
        }
      });

      // Add card button
      column.querySelector('.kanban-add-card').addEventListener('click', () => {
        showTaskModal({ status: col.status }, () => renderView(container));
      });

      board.appendChild(column);
    });

    container.appendChild(board);
  }

  function createKanbanCard(task) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.id = task.id;

    const project = task.projectId ? Store.projects.getById(task.projectId) : null;
    const isOverdue = Utils.isOverdue(task.endDate) && task.status !== 'done';

    card.innerHTML = `
      <div class="kanban-card-title">${Utils.escapeHtml(task.name)}</div>
      <div class="kanban-card-meta">
        ${Utils.priorityBadge(task.priority)}
        ${Utils.energyBadge(task.energy)}
      </div>
      ${task.endDate || project ? `
        <div class="kanban-card-footer">
          ${task.endDate ? `
            <span class="kanban-card-date ${isOverdue ? 'overdue' : ''}">
              ${Utils.icons.calendar} ${Utils.formatDate(task.endDate)}
            </span>` : '<span></span>'}
          ${project ? `<span style="font-size:0.75rem;color:var(--text-tertiary)">${Utils.escapeHtml(project.name)}</span>` : ''}
        </div>` : ''}
    `;

    // Drag events
    card.addEventListener('dragstart', (e) => {
      draggedTaskId = task.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedTaskId = null;
    });

    // Click to edit
    card.addEventListener('click', () => {
      showTaskModal(task, () => {
        const container = document.getElementById('task-view-content');
        if (container) renderView(container);
      });
    });

    return card;
  }

  // ============================================
  // Calendar View
  // ============================================
  function renderCalendarView(container) {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const calView = document.createElement('div');
    calView.className = 'calendar-view';

    calView.innerHTML = `
      <div class="calendar-header">
        <div class="calendar-nav">
          <button class="btn btn-secondary btn-sm" id="cal-prev">${Utils.icons.chevronLeft}</button>
          <span class="calendar-month-title">${monthName}</span>
          <button class="btn btn-secondary btn-sm" id="cal-next">${Utils.icons.chevronRight}</button>
        </div>
        <button class="btn btn-secondary btn-sm" id="cal-today">Today</button>
      </div>
      <div class="calendar-grid" id="calendar-grid"></div>
    `;

    calView.querySelector('#cal-prev').addEventListener('click', () => {
      calendarDate = new Date(year, month - 1, 1);
      renderView(container);
    });

    calView.querySelector('#cal-next').addEventListener('click', () => {
      calendarDate = new Date(year, month + 1, 1);
      renderView(container);
    });

    calView.querySelector('#cal-today').addEventListener('click', () => {
      calendarDate = new Date();
      renderView(container);
    });

    const grid = calView.querySelector('#calendar-grid');

    // Day headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      grid.appendChild(header);
    });

    // Calendar days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const today = Utils.today();

    const allTasks = Store.tasks.getAll();

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = document.createElement('div');
      day.className = 'calendar-day other-month';
      day.innerHTML = `<div class="calendar-day-number">${daysInPrevMonth - i}</div>`;
      grid.appendChild(day);
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === today;

      const dayTasks = allTasks.filter(t =>
        t.endDate === dateStr || t.startDate === dateStr
      );

      const day = document.createElement('div');
      day.className = `calendar-day ${isToday ? 'today' : ''}`;

      let eventsHtml = dayTasks.slice(0, 3).map(t => `
        <div class="calendar-event ${t.status}" title="${Utils.escapeHtml(t.name)}" data-id="${t.id}">
          ${Utils.escapeHtml(Utils.truncate(t.name, 20))}
        </div>
      `).join('');

      if (dayTasks.length > 3) {
        eventsHtml += `<div style="font-size:0.6875rem;color:var(--text-tertiary);padding:1px 4px">+${dayTasks.length - 3} more</div>`;
      }

      day.innerHTML = `
        <div class="calendar-day-number">${d}</div>
        ${eventsHtml}
      `;

      // Click on event
      day.querySelectorAll('.calendar-event[data-id]').forEach(ev => {
        ev.addEventListener('click', (e) => {
          e.stopPropagation();
          const task = Store.tasks.getById(ev.dataset.id);
          if (task) showTaskModal(task, () => renderView(container));
        });
      });

      // Click on day to add task
      day.addEventListener('click', () => {
        showTaskModal({ startDate: dateStr, endDate: dateStr }, () => renderView(container));
      });

      grid.appendChild(day);
    }

    // Next month padding
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      const day = document.createElement('div');
      day.className = 'calendar-day other-month';
      day.innerHTML = `<div class="calendar-day-number">${i}</div>`;
      grid.appendChild(day);
    }

    container.appendChild(calView);
  }

  // ============================================
  // Task Modal (Add / Edit)
  // ============================================
  function showTaskModal(task, onSave) {
    const isEdit = task && task.id;
    const projects = Store.projects.getAll();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit Task' : 'Add Task'}</h3>
          <button class="btn-icon" id="close-task-modal">${Utils.icons.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Task Name *</label>
            <input type="text" id="task-name" placeholder="What needs to be done?" value="${Utils.escapeHtml(task?.name || '')}" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Status</label>
              <select id="task-status">
                ${['not-started','in-progress','done','blocked','backlog'].map(s =>
                  `<option value="${s}" ${(task?.status || 'not-started') === s ? 'selected' : ''}>${s.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Priority</label>
              <select id="task-priority">
                ${['low','medium','high','urgent'].map(p =>
                  `<option value="${p}" ${(task?.priority || 'medium') === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Energy Level</label>
              <select id="task-energy">
                ${['low','medium','high'].map(e =>
                  `<option value="${e}" ${(task?.energy || 'medium') === e ? 'selected' : ''}>${e.charAt(0).toUpperCase() + e.slice(1)}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Project</label>
              <select id="task-project">
                <option value="">No Project</option>
                ${projects.map(p =>
                  `<option value="${p.id}" ${task?.projectId === p.id ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Start Date</label>
              <input type="date" id="task-start" value="${task?.startDate || ''}" />
            </div>
            <div class="form-group">
              <label>Due Date</label>
              <input type="date" id="task-end" value="${task?.endDate || ''}" />
            </div>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="task-notes" rows="3" placeholder="Add notes...">${Utils.escapeHtml(task?.notes || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          ${isEdit ? `<button class="btn btn-danger btn-sm" id="delete-task-modal-btn">Delete</button>` : ''}
          <button class="btn btn-secondary" id="cancel-task-modal">Cancel</button>
          <button class="btn btn-primary" id="save-task-modal">${isEdit ? 'Save Changes' : 'Add Task'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Focus name input
    setTimeout(() => overlay.querySelector('#task-name').focus(), 50);

    // Close handlers
    const close = () => overlay.remove();
    overlay.querySelector('#close-task-modal').addEventListener('click', close);
    overlay.querySelector('#cancel-task-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // Delete
    if (isEdit) {
      overlay.querySelector('#delete-task-modal-btn').addEventListener('click', () => {
        if (confirm(`Delete "${task.name}"?`)) {
          Store.tasks.delete(task.id);
          Utils.toast('Task deleted', 'error');
          close();
          if (onSave) onSave();
        }
      });
    }

    // Save
    overlay.querySelector('#save-task-modal').addEventListener('click', () => {
      const name = overlay.querySelector('#task-name').value.trim();
      if (!name) {
        overlay.querySelector('#task-name').focus();
        overlay.querySelector('#task-name').style.borderColor = '#dc2626';
        return;
      }

      const data = {
        name,
        status: overlay.querySelector('#task-status').value,
        priority: overlay.querySelector('#task-priority').value,
        energy: overlay.querySelector('#task-energy').value,
        projectId: overlay.querySelector('#task-project').value,
        startDate: overlay.querySelector('#task-start').value,
        endDate: overlay.querySelector('#task-end').value,
        notes: overlay.querySelector('#task-notes').value.trim()
      };

      if (isEdit) {
        Store.tasks.update(task.id, data);
        Utils.toast('Task updated', 'success');
      } else {
        Store.tasks.add(data);
        Utils.toast('Task added', 'success');
      }

      close();
      if (onSave) onSave();
    });

    // Enter to save
    overlay.querySelector('#task-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') overlay.querySelector('#save-task-modal').click();
    });
  }

  return { render, showTaskModal };
})();
