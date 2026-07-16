// Snagd — popup.js
// Handles all popup dashboard logic: render, search, filter, complete, delete,
// priority, edit tasks, due dates, badge count, projects, activity.

(() => {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  let allTasks            = [];
  let activeTab           = 'tasks'; // 'tasks', 'inbox', 'projects', 'activity'
  let activeFilter        = 'all';   // 'all', 'active', 'completed'
  let searchQuery         = '';
  let activeProjectDomain = null;    // domain name filter for projects view

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  const taskList     = document.getElementById('tt-task-list');
  const emptyState   = document.getElementById('tt-empty');
  const badge        = document.getElementById('tt-badge');
  const searchInput  = document.getElementById('tt-search');
  const clearBtn     = document.getElementById('tt-search-clear');
  const filterTabs   = document.querySelectorAll('.tt-filter-tab');
  const navItems     = document.querySelectorAll('.tt-nav-item');
  const countAll       = document.getElementById('count-all');
  const countActive    = document.getElementById('count-active');
  const countCompleted = document.getElementById('count-completed');

  const controlsRow   = document.getElementById('tt-controls-row');
  const filtersRow    = document.getElementById('tt-filters');
  const tableHeader   = document.getElementById('tt-table-header');
  const projectsView  = document.getElementById('tt-projects-view');
  const activityView  = document.getElementById('tt-activity-view');

  // ─── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    initTheme();
    allTasks = await loadTasks();
    render();
  }

  function initTheme() {
    chrome.storage.sync.get({ theme: 'auto' }, (settings) => {
      applyTheme(settings.theme || 'auto');
    });
  }

  function applyTheme(theme) {
    document.body.classList.remove('theme-auto');
    document.body.removeAttribute('data-theme');
    if (theme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
    } else if (theme === 'auto') {
      document.body.classList.add('theme-auto');
    }
  }

  // ─── Storage helpers ──────────────────────────────────────────────────────
  function loadTasks() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ tasks: [] }, (result) => {
        resolve(Array.isArray(result.tasks) ? result.tasks : []);
      });
    });
  }

  function saveTasks(tasks) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ tasks }, resolve);
    });
  }

  // ─── Render pipeline ──────────────────────────────────────────────────────
  function render() {
    updateCounts();
    updateBadge();
    
    // Hide all view panels first
    taskList.hidden     = true;
    projectsView.hidden = true;
    activityView.hidden = true;
    emptyState.hidden   = true;
    controlsRow.hidden  = true;
    filtersRow.hidden   = true;
    tableHeader.hidden  = true;

    if (activeTab === 'tasks') {
      controlsRow.hidden  = false;
      filtersRow.hidden   = false;
      tableHeader.hidden  = false;
      renderTaskList(getFilteredTasks());
    } else if (activeTab === 'inbox') {
      controlsRow.hidden  = false;
      tableHeader.hidden  = false;
      renderTaskList(getInboxTasks());
    } else if (activeTab === 'projects') {
      projectsView.hidden = false;
      renderProjects();
    } else if (activeTab === 'activity') {
      activityView.hidden = false;
      renderActivity();
    }
  }

  function getFilteredTasks() {
    let tasks = allTasks;

    if (activeFilter === 'active') {
      tasks = tasks.filter(t => t.status === 'active');
    } else if (activeFilter === 'completed') {
      tasks = tasks.filter(t => t.status === 'completed');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.note  || '').toLowerCase().includes(q)
      );
    }

    return sortTasks(tasks);
  }

  // Inbox Task Filter: Active tasks with no priority and no due date (unprocessed capture bucket)
  function getInboxTasks() {
    let tasks = allTasks.filter(t => t.status === 'active' && (!t.priority || t.priority === 'none') && !t.due_at);
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.note  || '').toLowerCase().includes(q)
      );
    }

    return sortTasks(tasks);
  }

  function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      if (a.status === 'active') {
        const aOver = isOverdue(a), bOver = isOverdue(b);
        if (aOver !== bOver) return aOver ? -1 : 1;
        if (a.due_at && b.due_at) return a.due_at - b.due_at;
        if (a.due_at) return -1;
        if (b.due_at) return 1;
      }
      return b.created_at - a.created_at;
    });
  }

  function updateCounts() {
    const active    = allTasks.filter(t => t.status === 'active').length;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const total     = allTasks.length;
    countAll.textContent       = `(${total})`;
    countActive.textContent    = `(${active})`;
    countCompleted.textContent = `(${completed})`;
  }

  function updateBadge() {
    const active = allTasks.filter(t => t.status === 'active').length;
    badge.textContent = `${active} task${active !== 1 ? 's' : ''}`;
  }

  // ─── Due date helpers ─────────────────────────────────────────────────────
  function isOverdue(task) {
    return task.status === 'active' && task.due_at && task.due_at < Date.now();
  }

  function isDueToday(task) {
    if (!task.due_at || task.status !== 'active') return false;
    const due   = new Date(task.due_at);
    const today = new Date();
    return due.getFullYear() === today.getFullYear() &&
           due.getMonth()    === today.getMonth()    &&
           due.getDate()     === today.getDate();
  }

  function formatDueDate(due_at) {
    if (!due_at) return '';
    const due   = new Date(due_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(due);
    dueDay.setHours(0, 0, 0, 0);
    const diff = Math.round((dueDay - today) / 86400000);

    if (diff < 0)  return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    if (diff <= 7)  return `Due in ${diff}d`;
    return `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }

  function toDateInputValue(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ─── Task list rendering ──────────────────────────────────────────────────
  function renderTaskList(tasks) {
    taskList.innerHTML = '';

    if (tasks.length === 0) {
      taskList.hidden   = true;
      emptyState.hidden = false;
      return;
    }

    taskList.hidden   = false;
    emptyState.hidden = true;

    const fragment = document.createDocumentFragment();
    tasks.forEach(task => fragment.appendChild(buildCard(task)));
    taskList.appendChild(fragment);
  }

  // ─── Build task card ──────────────────────────────────────────────────────
  function buildCard(task) {
    const isCompleted = task.status === 'completed';
    const overdue     = isOverdue(task);
    const today       = isDueToday(task);

    const card = document.createElement('div');
    card.className = [
      'tt-card',
      isCompleted ? 'tt-completed' : '',
      overdue     ? 'tt-overdue'   : '',
    ].filter(Boolean).join(' ');
    card.dataset.id = task.id;
    card.setAttribute('role', 'listitem');

    // Add selected row highlight
    card.addEventListener('click', (e) => {
      if (e.target.closest('.tt-checkbox') || e.target.closest('.tt-action-trigger') || e.target.closest('.tt-card-priority-wrap') || e.target.closest('.tt-edit-btn-save') || e.target.closest('.tt-edit-btn-cancel')) {
        return;
      }
      document.querySelectorAll('.tt-card').forEach(c => c.classList.remove('tt-selected'));
      card.classList.add('tt-selected');
    });

    // ── Column 1: Checkbox ──
    const checkbox = document.createElement('div');
    checkbox.className = 'tt-checkbox' + (isCompleted ? ' tt-checked' : '');
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('aria-checked', String(isCompleted));
    checkbox.setAttribute('tabindex', '0');
    checkbox.title = isCompleted ? 'Mark as active' : 'Mark as complete';

    const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    checkSvg.setAttribute('class', 'tt-checkbox-check');
    checkSvg.setAttribute('viewBox', '0 0 10 10');
    checkSvg.setAttribute('fill', 'none');
    checkSvg.setAttribute('aria-hidden', 'true');
    const checkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    checkPath.setAttribute('d', 'M1.5 5 L4 7.5 L8.5 2.5');
    checkPath.setAttribute('stroke', '#FFFFFF');
    checkPath.setAttribute('stroke-width', '2.2');
    checkPath.setAttribute('stroke-linecap', 'round');
    checkPath.setAttribute('stroke-linejoin', 'round');
    checkSvg.appendChild(checkPath);
    checkbox.appendChild(checkSvg);
    checkbox.addEventListener('click', () => handleComplete(task.id));
    checkbox.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleComplete(task.id); });
    card.appendChild(checkbox);

    // ── Column 2: Title Block ──
    const titleWrap = document.createElement('div');
    titleWrap.className = 'tt-card-title-wrap';

    const fav = buildFavicon(task);
    if (fav) titleWrap.appendChild(fav);

    const title = document.createElement('div');
    title.className = 'tt-card-title';
    title.textContent = task.title || task.url || 'Untitled';
    title.title = task.title || '';
    title.addEventListener('click', () => chrome.tabs.create({ url: task.url }));
    titleWrap.appendChild(title);
    card.appendChild(titleWrap);

    // ── Column 3: Due Date ──
    const dueCol = document.createElement('div');
    dueCol.className = 'tt-card-due' + (overdue ? ' tt-due-overdue' : today ? ' tt-due-today' : '');
    dueCol.textContent = task.due_at ? formatDueDate(task.due_at).replace('Due ', '') : '—';
    card.appendChild(dueCol);

    // ── Column 4: Priority ──
    const prioWrap = document.createElement('div');
    prioWrap.className = 'tt-card-priority-wrap';
    prioWrap.addEventListener('click', () => handlePriorityToggle(task.id));

    const dot = document.createElement('div');
    dot.className = 'tt-priority-dot ' + (task.priority || 'none');
    prioWrap.appendChild(dot);

    const prioText = document.createElement('span');
    prioText.className = 'tt-priority-text ' + (task.priority || 'none');
    const prioNames = { p1: 'Red', p2: 'Orange', p3: 'Yellow', none: 'Green' };
    prioText.textContent = prioNames[task.priority || 'none'];
    prioWrap.appendChild(prioText);
    card.appendChild(prioWrap);

    // ── Column 5: Notes Pill ──
    const noteCol = document.createElement('div');
    if (task.note) {
      const pill = document.createElement('div');
      pill.className = 'tt-note-pill ' + (task.priority || 'none');
      pill.textContent = task.note;
      pill.title = task.note;
      pill.addEventListener('click', () => {
        const desc = card.querySelector('.tt-card-expanded-desc');
        if (desc) desc.hidden = !desc.hidden;
      });
      noteCol.appendChild(pill);
    } else {
      noteCol.textContent = '—';
      noteCol.style.color = 'var(--text-muted)';
      noteCol.style.fontSize = '11px';
    }
    card.appendChild(noteCol);

    // ── Column 6: Actions menu button ──
    const actionWrap = document.createElement('div');
    actionWrap.style.display = 'flex';
    actionWrap.style.alignItems = 'center';
    actionWrap.style.justifyContent = 'center';

    const trigger = document.createElement('button');
    trigger.className = 'tt-action-trigger';
    trigger.setAttribute('aria-label', 'Task options');
    trigger.title = 'Options';
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopover(task, card, trigger);
    });
    actionWrap.appendChild(trigger);
    card.appendChild(actionWrap);

    // ── Expander Description ──
    if (task.note) {
      const exp = document.createElement('div');
      exp.className = 'tt-card-expanded-desc';
      exp.hidden = true;
      exp.textContent = task.note;
      card.appendChild(exp);
    }

    return card;
  }

  // ─── Popover options overlay ────────────────────────────────────────────────
  function togglePopover(task, card, trigger) {
    const existing = card.querySelector('.tt-popover');
    if (existing) {
      existing.remove();
      return;
    }
    
    document.querySelectorAll('.tt-popover').forEach(p => p.remove());

    const popover = document.createElement('div');
    popover.className = 'tt-popover';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.remove();
      showEditMode(task, card);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tt-popover-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.remove();
      handleDelete(task.id);
    });

    popover.appendChild(editBtn);
    popover.appendChild(deleteBtn);
    card.appendChild(popover);

    const closePop = () => {
      popover.remove();
      document.removeEventListener('click', closePop);
    };
    setTimeout(() => document.addEventListener('click', closePop), 10);
  }

  async function handleDelete(id) {
    allTasks = allTasks.filter(t => t.id !== id);
    await saveTasks(allTasks);
    render();
  }

  // ─── Inline edit mode ─────────────────────────────────────────────────────
  function showEditMode(task, card) {
    card.classList.add('tt-editing');
    card.innerHTML = '';
    
    const form = document.createElement('div');
    form.style.gridColumn = '1 / -1';
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '8px';
    
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'tt-edit-title';
    titleInput.value = task.title || '';
    titleInput.placeholder = 'Task title';
    titleInput.maxLength = 200;
    
    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'tt-edit-note';
    noteInput.value = task.note || '';
    noteInput.placeholder = 'Add note (optional)';
    noteInput.maxLength = 120;
    
    const dueInput = document.createElement('input');
    dueInput.type = 'date';
    dueInput.className = 'tt-edit-due';
    dueInput.value = toDateInputValue(task.due_at);
    
    const actionsRow = document.createElement('div');
    actionsRow.className = 'tt-edit-actions-row';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'tt-edit-btn-save';
    saveBtn.textContent = 'Save';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'tt-edit-btn-cancel';
    cancelBtn.textContent = 'Cancel';
    
    actionsRow.appendChild(saveBtn);
    actionsRow.appendChild(cancelBtn);
    
    form.appendChild(titleInput);
    form.appendChild(noteInput);
    form.appendChild(dueInput);
    form.appendChild(actionsRow);
    
    card.appendChild(form);
    titleInput.focus();
    
    saveBtn.addEventListener('click', async () => {
      const newTitle = titleInput.value.trim() || task.title;
      const newNote = noteInput.value.trim() || null;
      const newDue = dueInput.value ? new Date(dueInput.value).getTime() : null;
      
      const t = allTasks.find(item => item.id === task.id);
      if (t) {
        t.title = newTitle;
        t.note = newNote;
        t.due_at = newDue;
      }
      await saveTasks(allTasks);
      render();
    });
    
    cancelBtn.addEventListener('click', () => {
      render();
    });

    titleInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') saveBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });
  }

  // ─── Projects (Domain Directory) Rendering ───────────────────────────────
  function renderProjects() {
    projectsView.innerHTML = '';
    const activeTasks = allTasks.filter(t => t.status === 'active');
    
    if (activeProjectDomain) {
      // 1. Render tasks inside selected project domain
      const backBtn = document.createElement('button');
      backBtn.className = 'tt-projects-back-btn';
      backBtn.innerHTML = `&larr; Back to Websites`;
      backBtn.addEventListener('click', () => {
        activeProjectDomain = null;
        renderProjects();
      });
      projectsView.appendChild(backBtn);

      const domainTasks = activeTasks.filter(t => getDomain(t.url) === activeProjectDomain);
      if (domainTasks.length === 0) {
        activeProjectDomain = null;
        renderProjects();
        return;
      }

      // Add a Restore Workspace button on the right
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'tt-edit-btn-save';
      restoreBtn.style.float = 'right';
      restoreBtn.style.fontSize = '10px';
      restoreBtn.style.padding = '3px 8px';
      restoreBtn.style.borderRadius = '4px';
      restoreBtn.textContent = 'Restore Workspace';
      restoreBtn.title = 'Open all tabs as a Chrome Tab Group';
      restoreBtn.addEventListener('click', async () => {
        const createdTabs = await Promise.all(domainTasks.map(t => chrome.tabs.create({ url: t.url, active: false })));
        const tabIds = createdTabs.map(t => t.id);
        const group = await chrome.tabs.group({ tabIds });
        chrome.tabGroups.update(group, { title: activeProjectDomain, color: 'cyan' });
      });
      projectsView.appendChild(restoreBtn);

      // Add a header label
      const projHeader = document.createElement('div');
      projHeader.className = 'tt-timeline-section-title';
      projHeader.textContent = `Tasks under ${activeProjectDomain}`;
      projectsView.appendChild(projHeader);

      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      domainTasks.forEach(task => wrap.appendChild(buildCard(task)));
      projectsView.appendChild(wrap);
    } else {
      // 2. Render list of website projects folder cards
      const domainsMap = {};
      activeTasks.forEach(task => {
        const dom = getDomain(task.url);
        domainsMap[dom] = (domainsMap[dom] || 0) + 1;
      });

      const domainList = Object.keys(domainsMap).sort((a,b) => domainsMap[b] - domainsMap[a]);
      if (domainList.length === 0) {
        const p = document.createElement('p');
        p.style.fontSize = '12px';
        p.style.color = 'var(--text-muted)';
        p.style.textAlign = 'center';
        p.style.padding = '40px 0';
        p.textContent = 'No website projects yet. Save some pages first!';
        projectsView.appendChild(p);
        return;
      }

      const projHeader = document.createElement('div');
      projHeader.className = 'tt-timeline-section-title';
      projHeader.textContent = 'Website Projects Directory';
      projectsView.appendChild(projHeader);

      domainList.forEach(domain => {
        const count = domainsMap[domain];
        const card = document.createElement('div');
        card.className = 'tt-project-folder-card';
        card.innerHTML = `
          <div class="tt-project-folder-left">
            <svg class="tt-project-folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="tt-project-folder-name" title="${domain}">${domain}</span>
          </div>
          <span class="tt-project-folder-count">${count} active</span>
        `;
        card.addEventListener('click', () => {
          activeProjectDomain = domain;
          renderProjects();
        });
        projectsView.appendChild(card);
      });
    }
  }

  // ─── Activity Dashboard Rendering ─────────────────────────────────────────
  function renderActivity() {
    activityView.innerHTML = '';
    
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const activeTasks    = allTasks.filter(t => t.status === 'active');
    const totalCount     = allTasks.length;
    const completedCount = completedTasks.length;
    const activeCount    = activeTasks.length;
    const rate           = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Render Stats Grid
    const statsGrid = document.createElement('div');
    statsGrid.className = 'tt-stats-grid';
    statsGrid.innerHTML = `
      <div class="tt-stats-card">
        <div class="tt-stats-card-lbl">Completed</div>
        <div class="tt-stats-card-val">${completedCount}</div>
      </div>
      <div class="tt-stats-card">
        <div class="tt-stats-card-lbl">Success Rate</div>
        <div class="tt-stats-card-val">${rate}%</div>
      </div>
    `;
    activityView.appendChild(statsGrid);

    // Timeline Title
    const title = document.createElement('div');
    title.className = 'tt-timeline-section-title';
    title.textContent = 'Recently Completed Tasks';
    activityView.appendChild(title);

    // List of Completed Tasks (descending by completion time)
    const sortedCompleted = [...completedTasks].sort((a,b) => (b.completed_at || 0) - (a.completed_at || 0)).slice(0, 15);
    
    if (sortedCompleted.length === 0) {
      const p = document.createElement('p');
      p.style.fontSize = '11px';
      p.style.color = 'var(--text-muted)';
      p.style.textAlign = 'center';
      p.style.padding = '20px 0';
      p.textContent = 'No completed tasks recorded yet. Check things off!';
      activityView.appendChild(p);
      return;
    }

    sortedCompleted.forEach(task => {
      const item = document.createElement('div');
      item.className = 'tt-timeline-item';
      
      const completedDate = task.completed_at ? new Date(task.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date';
      item.innerHTML = `
        <span class="tt-timeline-item-title" title="${task.title || task.url}">${task.title || task.url}</span>
        <span class="tt-timeline-item-date">Completed on ${completedDate}</span>
      `;
      activityView.appendChild(item);
    });
  }

  // ─── Favicon builder ──────────────────────────────────────────────────────
  function buildFavicon(task) {
    if (task.favicon) {
      const img = document.createElement('img');
      img.className = 'tt-favicon';
      img.src = task.favicon;
      img.alt = '';
      img.width  = 14;
      img.height = 14;
      img.addEventListener('error', () => img.replaceWith(makeFaviconFallback(task.url)));
      return img;
    }
    return makeFaviconFallback(task.url);
  }

  function makeFaviconFallback(url) {
    const el = document.createElement('div');
    el.className = 'tt-favicon-fallback';
    el.textContent = getDomainInitial(url);
    el.style.width = '14px';
    el.style.height = '14px';
    el.style.fontSize = '9px';
    el.style.borderRadius = '3px';
    return el;
  }

  function getDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch (_) { return url || ''; }
  }

  function getDomainInitial(url) {
    const d = getDomain(url);
    return d ? d[0].toUpperCase() : '?';
  }

  // ─── Complete / Uncomplete ────────────────────────────────────────────────
  async function handleComplete(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    if (task.status === 'active') {
      task.status       = 'completed';
      task.completed_at = Date.now();
    } else {
      task.status       = 'active';
      task.completed_at = null;
    }
    await saveTasks(allTasks);
    render();
  }

  // ─── Priority cycle ───────────────────────────────────────────────────────
  async function handlePriorityToggle(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    const cycle = { null: 'p1', p1: 'p2', p2: 'p3', p3: null };
    task.priority = cycle[task.priority] ?? cycle['null'];
    await saveTasks(allTasks);
    render();
  }

  // ─── Search ───────────────────────────────────────────────────────────────
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    clearBtn.classList.toggle('visible', searchQuery.length > 0);
    render();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearBtn.classList.remove('visible');
    searchInput.focus();
    render();
  });

  // ─── Filter tabs ──────────────────────────────────────────────────────────
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('tt-active'));
      tab.classList.add('tt-active');
      activeFilter = tab.dataset.filter;
      render();
    });
  });

  // ─── Navigation Tabs Trigger ──────────────────────────────────────────────
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.id === 'tt-nav-settings') {
        chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
        return;
      }
      navItems.forEach(t => t.classList.remove('tt-active'));
      item.classList.add('tt-active');
      activeTab = item.dataset.tab;
      activeProjectDomain = null; // reset domain filter on tab change
      render();
    });
  });

  // ─── Live storage updates ─────────────────────────────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.tasks) {
      allTasks = Array.isArray(changes.tasks.newValue) ? changes.tasks.newValue : [];
      render();
    }
    if (area === 'sync' && changes.theme) {
      applyTheme(changes.theme.newValue);
    }
  });

  // ─── Boot ─────────────────────────────────────────────────────────────────
  init();

})();
