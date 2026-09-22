/**
 * Popup script.
 *
 * Views:
 *   view-login  — shown when no token is stored
 *   view-main   — task/study form pre-filled from the active tab
 *
 * Tabs (inside view-main):
 *   task   — creates a To-Do Task via POST /api/extension/capture
 *   study  — creates a Study Item via POST /api/extension/study-capture
 */

// ── Helpers ────────────────────────────────────────────────────────────────────
const $     = id => document.getElementById(id);
const show  = id => $(id).classList.remove('hidden');
const hide  = id => $(id).classList.add('hidden');

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function defaultTime() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function showResult(text, type) {
  const el = $('result');
  el.textContent = text;
  el.className   = `result ${type}`;
  show('result');
}

function loadTasks() {
  chrome.runtime.sendMessage({ type: 'GET_TASKS' }, res => {
    const list = $('task-list');
    if (!res?.success) {
      list.textContent = res?.error || 'Unable to load tasks.';
      return;
    }
    const tasks = res.data || [];
    list.replaceChildren();
    if (!tasks.length) {
      list.textContent = 'No tasks yet.';
      return;
    }
    tasks.slice(0, 8).forEach(task => {
      const row = document.createElement('div');
      row.className = `task-row ${task.status === 'done' ? 'done' : ''}`;
      row.textContent = task.title;
      list.appendChild(row);
    });
  });
}

// ── Tab state ──────────────────────────────────────────────────────────────────
let activeTab = 'task';

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (activeTab === 'task') {
      show('form-task');
      hide('form-study');
    } else {
      hide('form-task');
      show('form-study');
    }
    hide('result');
  });
});

// ── Priority buttons (task) ────────────────────────────────────────────────────
let selectedPriority = 2;

document.querySelectorAll('[data-p]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-p]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPriority = Number(btn.dataset.p);
  });
});

// ── Priority buttons (study) ───────────────────────────────────────────────────
let selectedStudyPriority = 2;

document.querySelectorAll('[data-sp]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-sp]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedStudyPriority = Number(btn.dataset.sp);
  });
});

// ── Startup ────────────────────────────────────────────────────────────────────
chrome.storage.local.get(['token'], async ({ token }) => {

  // Get config for dynamic URLs
  chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, cfg => {
    const appUrl = cfg?.data?.appUrl || 'http://localhost:3000';
    $('link-tasks').href    = `${appUrl}/tasks`;
    $('link-app-login').href = appUrl;
  });

  if (!token) {
    show('view-login');
    return;
  }

  $('status-dot').className = 'dot dot-on';
  show('view-main');
  loadTasks();

  // Set default date / time
  $('inp-date').value = todayISO();
  $('inp-time').value = defaultTime();

  // Load page data from content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_DATA' }, data => {
    if (chrome.runtime.lastError || !data) {
      $('page-title').textContent    = tab.title || 'Unknown page';
      $('page-url').textContent      = tab.url   || '';
      $('inp-title').value           = tab.title || '';
      $('inp-study-title').value     = tab.title || '';
      return;
    }

    $('page-title').textContent  = data.title;
    $('page-url').textContent    = data.url;
    $('inp-title').value         = data.topic || data.title;
    $('inp-study-title').value   = data.topic || data.title;

    const badge = $('site-badge');
    if (data.isEducational) {
      badge.textContent = '📚 Educational';
      badge.className   = 'site-badge';
    } else {
      badge.textContent = 'Other';
      badge.className   = 'site-badge other';
    }
  });
});

// ── Connect (login) ────────────────────────────────────────────────────────────
$('btn-connect').addEventListener('click', () => {
  const token = $('token-inp').value.trim();
  if (!token) { alert('Please paste your access_token.'); return; }

  chrome.runtime.sendMessage({ type: 'SAVE_TOKEN', token }, res => {
    if (res?.success) window.location.reload();
  });
});

// ── Open settings ──────────────────────────────────────────────────────────────
$('btn-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Save Task ─────────────────────────────────────────────────────────────────
$('btn-save').addEventListener('click', async () => {
  const title = $('inp-title').value.trim();
  const date  = $('inp-date').value;
  const time  = $('inp-time').value || '23:59';

  if (!title) { showResult('Please enter a task title.', 'err'); return; }

  $('btn-save').disabled    = true;
  $('btn-save').textContent = 'Saving…';
  hide('result');

  const dueDate = date
    ? new Date(`${date}T${time}:00`).toISOString()
    : undefined;

  const [tab]    = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageUrl  = tab?.url   || window.location.href;
  const pageTitle = tab?.title || title;

  chrome.runtime.sendMessage({
    type: 'CREATE_TASK',
    data: { pageUrl, pageTitle, taskTitle: title, dueDate, reminderAt: dueDate, priority: selectedPriority },
  }, res => {
    $('btn-save').disabled    = false;
    $('btn-save').textContent = 'Save as Task';

    if (res?.success) {
      showResult('✓ Task saved! It will appear in your To-Do list.', 'ok');
      setTimeout(() => window.close(), 2000);
    } else {
      showResult(res?.error || 'Failed — check your token.', 'err');
    }
  });
});

$('btn-refresh-tasks').addEventListener('click', loadTasks);

// ── Save Study Item ────────────────────────────────────────────────────────────
$('btn-save-study').addEventListener('click', async () => {
  const studyTitle = $('inp-study-title').value.trim();
  const studyType  = $('inp-study-type').value;
  const hoursRaw   = parseFloat($('inp-study-hours').value);
  const estimatedHours = isNaN(hoursRaw) || hoursRaw <= 0 ? 10 : hoursRaw;

  if (!studyTitle) { showResult('Please enter a study title.', 'err'); return; }

  $('btn-save-study').disabled    = true;
  $('btn-save-study').textContent = 'Saving…';
  hide('result');

  const [tab]    = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageUrl  = tab?.url   || window.location.href;
  const pageTitle = tab?.title || studyTitle;

  chrome.runtime.sendMessage({
    type: 'CREATE_STUDY_ITEM',
    data: {
      pageUrl,
      pageTitle,
      studyTitle,
      studyType,
      estimatedHours,
      priority: selectedStudyPriority,
    },
  }, res => {
    $('btn-save-study').disabled    = false;
    $('btn-save-study').textContent = 'Add to Study Scheduler';

    if (res?.success) {
      showResult('✓ Added to your Study Scheduler!', 'ok');
      setTimeout(() => window.close(), 2000);
    } else {
      showResult(res?.error || 'Failed — check your token.', 'err');
    }
  });
});

// ── Disconnect ─────────────────────────────────────────────────────────────────
$('btn-disconnect').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_TOKEN' }, () =>
    window.location.reload(),
  );
});
