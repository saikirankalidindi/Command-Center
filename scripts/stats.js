/**
 * stats.js - Stats page rendering
 */

const Stats = (() => {

  function render(container) {
    const allTasks = Store.tasks.getAll();
    const completedToday = Store.tasks.getCompletedToday();
    const overdue = Store.tasks.getOverdue();
    const weeklyData = Store.stats.getWeeklyData();
    const completionRate = Store.stats.getCompletionRate();
    const onTimeRate = Store.stats.getOnTimeRate();
    const statsData = Store.stats.get();

    // Count tasks due this week
    const today = Utils.today();
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const thisWeek = allTasks.filter(t => t.endDate >= today && t.endDate <= weekEnd);

    // Status breakdown
    const statusCounts = {
      'not-started': allTasks.filter(t => t.status === 'not-started').length,
      'in-progress': allTasks.filter(t => t.status === 'in-progress').length,
      'done': allTasks.filter(t => t.status === 'done').length,
      'blocked': allTasks.filter(t => t.status === 'blocked').length,
      'backlog': allTasks.filter(t => t.status === 'backlog').length
    };

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Stats</h1>
        <span style="font-size:0.875rem;color:var(--text-tertiary)">${Utils.formatTodayFull()}</span>
      </div>

      <!-- Summary Cards -->
      <div class="stats-grid">
        ${renderStatCard('Total Tasks', allTasks.length, 'All time', 'blue', Utils.icons.tasks)}
        ${renderStatCard('Completed Today', completedToday.length, 'tasks done today', 'green', '✓')}
        ${renderStatCard('Overdue', overdue.length, 'need attention', 'red', '⚠')}
        ${renderStatCard('Due This Week', thisWeek.length, 'upcoming tasks', 'orange', Utils.icons.calendar)}
      </div>

      <!-- Charts Row -->
      <div class="stats-charts-grid">
        <!-- Weekly Bar Chart -->
        <div class="chart-card">
          <div class="chart-card-header">
            <div>
              <div class="chart-card-title">Weekly Activity</div>
              <div class="chart-card-subtitle">Tasks completed per day</div>
            </div>
          </div>
          ${renderBarChart(weeklyData)}
        </div>

        <!-- Completion Rate Ring -->
        <div class="chart-card">
          <div class="chart-card-header">
            <div>
              <div class="chart-card-title">Today's Rate</div>
              <div class="chart-card-subtitle">Daily completion</div>
            </div>
          </div>
          <div class="ring-chart-wrapper">
            ${renderRingChart(completionRate)}
            <div class="ring-legend">
              <div class="ring-legend-item">
                <div class="ring-legend-dot" style="background:var(--accent)"></div>
                <span class="ring-legend-label">Completed</span>
                <span class="ring-legend-value">${completedToday.length}</span>
              </div>
              <div class="ring-legend-item">
                <div class="ring-legend-dot" style="background:var(--border)"></div>
                <span class="ring-legend-label">Remaining</span>
                <span class="ring-legend-value">${allTasks.filter(t => t.status !== 'done').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="stats-bottom-grid">
        <!-- Streak Card -->
        <div class="streak-card">
          <div class="streak-icon">🔥</div>
          <div class="streak-info">
            <div class="streak-value">${statsData.streakDays || 0}</div>
            <div class="streak-label">Day Streak</div>
            <div class="streak-sub">Keep completing tasks daily!</div>
          </div>
        </div>

        <!-- On-time Rate -->
        <div class="completion-rate-card">
          <div class="completion-rate-header">
            <div>
              <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary)">On-Time Rate</div>
              <div style="font-size:0.8125rem;color:var(--text-tertiary)">Tasks completed by due date</div>
            </div>
          </div>
          <div class="completion-rate-value">${onTimeRate}%</div>
          <div class="completion-rate-bar">
            <div class="completion-rate-fill" style="width:${onTimeRate}%"></div>
          </div>
        </div>

        <!-- Status Breakdown -->
        <div class="chart-card" style="grid-column:1/-1">
          <div class="chart-card-header">
            <div class="chart-card-title">Task Status Breakdown</div>
          </div>
          ${renderStatusBreakdown(statusCounts, allTasks.length)}
        </div>
      </div>
    `;

    // Animate bars after render
    setTimeout(() => animateBars(container, weeklyData), 100);
  }

  function renderStatCard(label, value, sub, colorClass, icon) {
    return `
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">${label}</span>
          <div class="stat-card-icon ${colorClass}">${icon}</div>
        </div>
        <div class="stat-card-value">${value}</div>
        <div class="stat-card-sub">${sub}</div>
      </div>
    `;
  }

  function renderBarChart(weeklyData) {
    const maxVal = Math.max(...weeklyData.map(d => d.total), 1);

    return `
      <div class="bar-chart" id="weekly-bar-chart">
        ${weeklyData.map((d, i) => {
          const completedPct = Math.round((d.completed / maxVal) * 100);
          const totalPct = Math.round((d.total / maxVal) * 100);
          return `
            <div class="bar-group">
              <div class="bar-wrapper">
                <div class="bar total" data-height="${totalPct}" style="height:0%" title="${d.total} total tasks">
                  <div class="bar-tooltip">${d.total} total</div>
                </div>
                <div class="bar completed" data-height="${completedPct}" style="height:0%" title="${d.completed} completed">
                  <div class="bar-tooltip">${d.completed} done</div>
                </div>
              </div>
              <div class="bar-label">${d.day}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="display:flex;gap:16px;margin-top:12px;">
        <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--text-secondary)">
          <div style="width:10px;height:10px;border-radius:2px;background:var(--border)"></div> Total
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--text-secondary)">
          <div style="width:10px;height:10px;border-radius:2px;background:var(--accent)"></div> Completed
        </div>
      </div>
    `;
  }

  function animateBars(container, weeklyData) {
    const bars = container.querySelectorAll('.bar[data-height]');
    bars.forEach(bar => {
      const targetHeight = bar.dataset.height;
      bar.style.transition = 'height 0.6s ease';
      bar.style.height = targetHeight + '%';
    });
  }

  function renderRingChart(percentage) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return `
      <div class="ring-chart">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="${radius}" fill="none" stroke="var(--border)" stroke-width="12"/>
          <circle cx="70" cy="70" r="${radius}" fill="none" stroke="var(--accent)" stroke-width="12"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
            stroke-linecap="round" style="transition:stroke-dashoffset 0.8s ease"/>
        </svg>
        <div class="ring-chart-center">
          <div class="ring-chart-value">${percentage}%</div>
          <div class="ring-chart-label">done</div>
        </div>
      </div>
    `;
  }

  function renderStatusBreakdown(counts, total) {
    const statuses = [
      { key: 'not-started', label: 'Not Started', color: '#9b9a97' },
      { key: 'in-progress', label: 'In Progress', color: '#2383e2' },
      { key: 'done', label: 'Done', color: '#1a7f37' },
      { key: 'blocked', label: 'Blocked', color: '#dc2626' },
      { key: 'backlog', label: 'Backlog', color: '#7c3aed' }
    ];

    return `
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${statuses.map(s => {
          const count = counts[s.key] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return `
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:100px;font-size:0.8125rem;color:var(--text-secondary);flex-shrink:0">${s.label}</div>
              <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${s.color};border-radius:4px;transition:width 0.6s ease"></div>
              </div>
              <div style="width:40px;text-align:right;font-size:0.8125rem;font-weight:600;color:var(--text-primary)">${count}</div>
              <div style="width:36px;text-align:right;font-size:0.75rem;color:var(--text-tertiary)">${pct}%</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return { render };
})();
