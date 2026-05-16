/**
 * projects.js - Projects page rendering and interactions
 */

const Projects = (() => {
  let currentView = 'table';
  let sortField = 'name';
  let sortDir = 'asc';
  let filterStatus = 'all';
  let calendarDate = new Date();
  let draggedProjectId = null;

  // ============================================
  // Main render
  // ============================================
  function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Projects</h1>
        <button class="btn btn-primary" id="add-project-btn">
          ${Utils.icons.plus} Add Project
        </button>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
        <div class="view-tabs" id="project-view-tabs">
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
        <div class="filter-bar" id="project-filter-bar">
          ${renderFilterChips()}
        </div>
      </div>

      <div id="project-view-content"></div>
    `;

    container.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentView = tab.dataset.view;
        container.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderView(container.querySelector('#project-view-content'));
      });
    });

    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        filterStatus = chip.dataset.status;
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderView(container.querySelector('#project-view-content'));
      });
    });

    container.querySelector('#add-project-btn').addEventListener('click', () => {
      showProjectModal(null, () => render(container));
    });

    renderView(container.querySelector('#project-view-content'));
  }

  function renderFilterChips() {
    const statuses = [
      { value: 'all', label: 'All' },
      { value: 'not-started', label: 'Not Started' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'done', label: 'Done' },
      { value: 'backlog', label: 'Backlog' }
    ];
    return statuses.map(s => `
      <button class="filter-chip ${filterStatus === s.value ? 'active' : ''}" data-status="${s.value}">
        ${s.label}
      </button>
    `).join('');
  }

  function getFilteredProjects() {
    const all = Store.projects.getAll();
    if (filterStatus === 'all') return all;
    return all.filter(p => p.status === filterStatus);
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
  function renderTableView(container) {
    const projects = getFilteredProjects();

    projects.sort((a, b) => {
      let va = a[sortField] || '';
      let vb = b[sortField] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const columns = [
      { field: 'name', label: 'Name' },
      { field: 'status', label: 'Status' },
      { field: 'priority', label: 'Priority' },
      { field: 'endDate', label: 'Due Date' },
      { field: '_tasks', label: 'Tasks' },
      { field: '_actions', label: '' }
    ];

    const wrapper = document.createElement('div');
    wrapper.className = 'tasks-table-wrapper';

    if (projects.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state">
          ${Utils.icons.projects}
          <p>No projects found. Create your first project!</p>
        </div>`;
      container.appendChild(wrapper);
      return;
    }

    const table = document.createElement('table');
    table.className = 'tasks-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>${columns.map(col => {
      if (col.field === '_actions' || col.field === '_tasks') return `<th style="width:${col.field === '_tasks' ? '100px' : '80px'}">${col.label}</th>`;
      const isSorted = sortField === col.field;
      return `<th data-field="${col.field}" class="${isSorted ? 'sorted' : ''}">
        ${col.label}
        <span class="sort-icon">${isSorted ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </th>`;
    }).join('')}</tr>`;
    table.appendChild(thead);

    thead.querySelectorAll('th[data-field]').forEach(th => {
      th.addEventListener('click', () => {
        if (sortField === th.dataset.field) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortField = th.dataset.field;
          sortDir = 'asc';
        }
        renderView(container);
      });
    });

    const tbody = document.createElement('tbody');
    projects.forEach(project => {
      const tr = document.createElement('tr');
      const taskCount = Store.projects.getTaskCount(project.id);
      const completedCount = Store.projects.getCompletedTaskCount(project.id);
      const isOverdue = Utils.isOverdue(project.endDate) && project.status !== 'done';

      tr.innerHTML = `
        <td>
          <div class="project-name-cell">
            <div class="project-icon">📁</div>
            <span class="task-name-text">${Utils.escapeHtml(project.name)}</span>
          </div>
        </td>
        <td>${Utils.statusBadge(project.status)}</td>
        <td>${Utils.priorityBadge(project.priority)}</td>
        <td>
          <span style="font-size:0.8125rem;color:${isOverdue ? '#dc2626' : 'var(--text-secondary)'}">
            ${project.endDate ? Utils.formatDate(project.endDate) : '—'}
            ${isOverdue ? ' ⚠' : ''}
          </span>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:0.8125rem;color:var(--text-secondary)">${completedCount}/${taskCount}</span>
            ${taskCount > 0 ? `
              <div class="progress-bar" style="width:60px">
                <div class="progress-bar-fill ${project.status === 'done' ? 'done' : ''}" style="width:${taskCount > 0 ? Math.round(completedCount/taskCount*100) : 0}%"></div>
              </div>` : ''}
          </div>
        </td>
        <td>
          <div class="task-actions">
            <button class="btn-icon edit-proj-btn" data-id="${project.id}" title="Edit">${Utils.icons.edit}</button>
            <button class="btn-icon delete-proj-btn" data-id="${project.id}" title="Delete" style="color:#dc2626">${Utils.icons.trash}</button>
          </div>
        </td>
      `;

      tr.querySelector('.task-name-text').addEventListener('click', () => {
        showProjectModal(project, () => renderView(container));
      });

      tr.querySelector('.edit-proj-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showProjectModal(project, () => renderView(container));
      });

      tr.querySelector('.delete-proj-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${project.name}"? This will unlink all associated tasks.`)) {
          Store.projects.delete(project.id);
          Utils.toast('Project deleted', 'error');
          renderView(container);
        }
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }

  // ============================================
  // Kanban View
  // ============================================
  function renderKanbanView(container) {
    const columns = [
      { status: 'backlog', label: 'Backlog', dotClass: 'dot-backlog' },
      { status: 'not-started', label: 'Not Started', dotClass: 'dot-not-started' },
      { status: 'in-progress', label: 'In Progress', dotClass: 'dot-in-progress' },
      { status: 'done', label: 'Done', dotClass: 'dot-done' }
    ];

    const board = document.createElement('div');
    board.className = 'kanban-board';

    const allProjects = Store.projects.getAll();

    columns.forEach(col => {
      const projects = allProjects.filter(p => p.status === col.status);

      const column = document.createElement('div');
      column.className = 'kanban-column';
      column.dataset.status = col.status;

      column.innerHTML = `
        <div class="kanban-column-header">
          <div class="kanban-column-title">
            <span class="kanban-column-dot ${col.dotClass}"></span>
            ${col.label}
          </div>
          <span class="kanban-column-count">${projects.length}</span>
        </div>
        <div class="kanban-cards" id="proj-kanban-col-${col.status}"></div>
        <div class="kanban-add-card" data-status="${col.status}">
          ${Utils.icons.plus} Add project
        </div>
      `;

      const cardsContainer = column.querySelector('.kanban-cards');

      projects.forEach(project => {
        const card = createProjectKanbanCard(project);
        cardsContainer.appendChild(card);
      });

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
        if (draggedProjectId) {
          Store.projects.update(draggedProjectId, { status: col.status });
          draggedProjectId = null;
          renderView(container);
        }
      });

      column.querySelector('.kanban-add-card').addEventListener('click', () => {
        showProjectModal({ status: col.status }, () => renderView(container));
      });

      board.appendChild(column);
    });

    container.appendChild(board);
  }

  function createProjectKanbanCard(project) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.id = project.id;

    const taskCount = Store.projects.getTaskCount(project.id);
    const completedCount = Store.projects.getCompletedTaskCount(project.id);

    card.innerHTML = `
      <div class="kanban-card-title">${Utils.escapeHtml(project.name)}</div>
      ${project.description ? `<div style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:8px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${Utils.escapeHtml(project.description)}</div>` : ''}
      <div class="kanban-card-meta">
        ${Utils.priorityBadge(project.priority)}
      </div>
      <div class="kanban-card-footer">
        <span class="kanban-card-date">
          ${Utils.icons.tasks} ${completedCount}/${taskCount} tasks
        </span>
        ${project.endDate ? `<span class="kanban-card-date ${Utils.isOverdue(project.endDate) && project.status !== 'done' ? 'overdue' : ''}">${Utils.icons.calendar} ${Utils.formatDate(project.endDate)}</span>` : ''}
      </div>
    `;

    card.addEventListener('dragstart', (e) => {
      draggedProjectId = project.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedProjectId = null;
    });

    card.addEventListener('click', () => {
      showProjectModal(project, () => {
        const container = document.getElementById('project-view-content');
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
          <button class="btn btn-secondary btn-sm" id="proj-cal-prev">${Utils.icons.chevronLeft}</button>
          <span class="calendar-month-title">${monthName}</span>
          <button class="btn btn-secondary btn-sm" id="proj-cal-next">${Utils.icons.chevronRight}</button>
        </div>
        <button class="btn btn-secondary btn-sm" id="proj-cal-today">Today</button>
      </div>
      <div class="calendar-grid" id="proj-calendar-grid"></div>
    `;

    calView.querySelector('#proj-cal-prev').addEventListener('click', () => {
      calendarDate = new Date(year, month - 1, 1);
      renderView(container);
    });

    calView.querySelector('#proj-cal-next').addEventListener('click', () => {
      calendarDate = new Date(year, month + 1, 1);
      renderView(container);
    });

    calView.querySelector('#proj-cal-today').addEventListener('click', () => {
      calendarDate = new Date();
      renderView(container);
    });

    const grid = calView.querySelector('#proj-calendar-grid');

    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      grid.appendChild(header);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const today = Utils.today();
    const allProjects = Store.projects.getAll();

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = document.createElement('div');
      day.className = 'calendar-day other-month';
      day.innerHTML = `<div class="calendar-day-number">${daysInPrevMonth - i}</div>`;
      grid.appendChild(day);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === today;

      const dayProjects = allProjects.filter(p =>
        p.endDate === dateStr || p.startDate === dateStr
      );

      const day = document.createElement('div');
      day.className = `calendar-day ${isToday ? 'today' : ''}`;

      let eventsHtml = dayProjects.slice(0, 3).map(p => `
        <div class="calendar-event ${p.status}" title="${Utils.escapeHtml(p.name)}" data-id="${p.id}">
          📁 ${Utils.escapeHtml(Utils.truncate(p.name, 18))}
        </div>
      `).join('');

      if (dayProjects.length > 3) {
        eventsHtml += `<div style="font-size:0.6875rem;color:var(--text-tertiary);padding:1px 4px">+${dayProjects.length - 3} more</div>`;
      }

      day.innerHTML = `<div class="calendar-day-number">${d}</div>${eventsHtml}`;

      day.querySelectorAll('.calendar-event[data-id]').forEach(ev => {
        ev.addEventListener('click', (e) => {
          e.stopPropagation();
          const project = Store.projects.getById(ev.dataset.id);
          if (project) showProjectModal(project, () => renderView(container));
        });
      });

      grid.appendChild(day);
    }

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
  // Project Modal
  // ============================================
  function showProjectModal(project, onSave) {
    const isEdit = project && project.id;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit Project' : 'Add Project'}</h3>
          <button class="btn-icon" id="close-proj-modal">${Utils.icons.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Project Name *</label>
            <input type="text" id="proj-name" placeholder="Project name" value="${Utils.escapeHtml(project?.name || '')}" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="proj-desc" rows="3" placeholder="What is this project about?">${Utils.escapeHtml(project?.description || '')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Status</label>
              <select id="proj-status">
                ${['not-started','in-progress','done','backlog'].map(s =>
                  `<option value="${s}" ${(project?.status || 'not-started') === s ? 'selected' : ''}>${s.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Priority</label>
              <select id="proj-priority">
                ${['low','medium','high','urgent'].map(p =>
                  `<option value="${p}" ${(project?.priority || 'medium') === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Start Date</label>
              <input type="date" id="proj-start" value="${project?.startDate || ''}" />
            </div>
            <div class="form-group">
              <label>End Date</label>
              <input type="date" id="proj-end" value="${project?.endDate || ''}" />
            </div>
          </div>
          ${isEdit ? `
            <div class="form-group">
              <label>Linked Tasks</label>
              <div style="font-size:0.875rem;color:var(--text-secondary);padding:8px;background:var(--bg-secondary);border-radius:var(--radius-sm);border:1px solid var(--border)">
                ${Store.projects.getTaskCount(project.id)} tasks linked to this project
              </div>
            </div>` : ''}
        </div>
        <div class="modal-footer">
          ${isEdit ? `<button class="btn btn-danger btn-sm" id="delete-proj-modal-btn">Delete</button>` : ''}
          <button class="btn btn-secondary" id="cancel-proj-modal">Cancel</button>
          <button class="btn btn-primary" id="save-proj-modal">${isEdit ? 'Save Changes' : 'Add Project'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.querySelector('#proj-name').focus(), 50);

    const close = () => overlay.remove();
    overlay.querySelector('#close-proj-modal').addEventListener('click', close);
    overlay.querySelector('#cancel-proj-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    if (isEdit) {
      overlay.querySelector('#delete-proj-modal-btn').addEventListener('click', () => {
        if (confirm(`Delete "${project.name}"? This will unlink all associated tasks.`)) {
          Store.projects.delete(project.id);
          Utils.toast('Project deleted', 'error');
          close();
          if (onSave) onSave();
        }
      });
    }

    overlay.querySelector('#save-proj-modal').addEventListener('click', () => {
      const name = overlay.querySelector('#proj-name').value.trim();
      if (!name) {
        overlay.querySelector('#proj-name').focus();
        overlay.querySelector('#proj-name').style.borderColor = '#dc2626';
        return;
      }

      const data = {
        name,
        description: overlay.querySelector('#proj-desc').value.trim(),
        status: overlay.querySelector('#proj-status').value,
        priority: overlay.querySelector('#proj-priority').value,
        startDate: overlay.querySelector('#proj-start').value,
        endDate: overlay.querySelector('#proj-end').value
      };

      if (isEdit) {
        Store.projects.update(project.id, data);
        Utils.toast('Project updated', 'success');
      } else {
        Store.projects.add(data);
        Utils.toast('Project added', 'success');
      }

      close();
      if (onSave) onSave();
    });
  }

  return { render, showProjectModal };
})();
