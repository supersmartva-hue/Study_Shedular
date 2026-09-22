/**
 * Content script — injected on every page.
 *
 * On educational / study sites:
 *   • Shows a floating banner after 2.5 s with two options:
 *     "Save as Task" → creates a To-Do task
 *     "Add to Study" → creates a Study Scheduler item
 *
 * Uses Shadow DOM so the extension's styles are completely isolated from the page.
 */

// ── Site lists ─────────────────────────────────────────────────────────────────
const EDUCATIONAL = [
  'youtube.com', 'coursera.org', 'udemy.com', 'khanacademy.org', 'wikipedia.org',
  'stackoverflow.com', 'github.com', 'geeksforgeeks.org', 'w3schools.com',
  'docs.google.com', 'medium.com', 'dev.to', 'freecodecamp.org', 'cs50.harvard.edu',
  'edx.org', 'skillshare.com', 'pluralsight.com', 'brilliant.org', 'codecademy.com',
  'developer.mozilla.org', 'leetcode.com', 'hackerrank.com', 'towardsdatascience.com',
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function currentDomain() {
  return window.location.hostname.replace(/^www\./, '');
}

function isEducational() {
  const d = currentDomain();
  return EDUCATIONAL.some(e => d.includes(e));
}

function getPageMeta() {
  const topic = (
    document.querySelector('meta[property="og:title"]')?.content ||
    document.querySelector('meta[name="twitter:title"]')?.content ||
    document.querySelector('h1')?.textContent ||
    document.title
  )?.trim() || document.title;

  return { url: window.location.href, title: document.title, topic };
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function defaultTime() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Shadow-DOM banner ──────────────────────────────────────────────────────────
function mountBanner() {
  if (document.getElementById('sp-capture-host')) return;

  const meta = getPageMeta();
  const host = document.createElement('div');
  host.id = 'sp-capture-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
<style>
*{box-sizing:border-box;margin:0;padding:0}
#root{
  position:fixed;bottom:24px;right:24px;z-index:2147483647;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  font-size:13px;color:#1e293b;
}

/* ── Prompt banner ── */
#prompt{
  display:flex;align-items:center;gap:10px;
  background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;
  padding:10px 14px;
  box-shadow:0 8px 32px rgba(0,0,0,.13),0 2px 8px rgba(0,0,0,.06);
  animation:slide-in .25s ease-out;
}
@keyframes slide-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

.icon{font-size:20px;flex-shrink:0}
.prompt-body{flex:1;min-width:0}
.prompt-title{font-weight:700;font-size:12.5px;color:#1e293b}
.prompt-sub{
  font-size:11px;color:#64748b;margin-top:1px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;
}
.prompt-actions{display:flex;gap:5px;flex-shrink:0}
.btn-task{
  padding:5px 11px;background:#6366f1;color:#fff;
  border:none;border-radius:7px;font-size:11.5px;font-weight:700;
  cursor:pointer;white-space:nowrap;transition:background .15s;
}
.btn-task:hover{background:#4f46e5}
.btn-study{
  padding:5px 11px;background:#0891b2;color:#fff;
  border:none;border-radius:7px;font-size:11.5px;font-weight:700;
  cursor:pointer;white-space:nowrap;transition:background .15s;
}
.btn-study:hover{background:#0e7490}
.btn-x{
  width:24px;height:24px;background:#f1f5f9;border:none;border-radius:6px;
  color:#94a3b8;cursor:pointer;font-size:16px;
  display:flex;align-items:center;justify-content:center;
  transition:background .15s;flex-shrink:0;
}
.btn-x:hover{background:#e2e8f0;color:#475569}

/* ── Task form ── */
#form-wrap{
  background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;
  padding:15px;width:310px;
  box-shadow:0 8px 32px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.07);
  animation:slide-in .2s ease-out;display:none;
}
.form-head{
  display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;
}
.form-title{font-size:13px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:6px}

/* Tab switcher */
.tab-row{
  display:flex;gap:4px;background:#f1f5f9;
  border-radius:9px;padding:3px;margin-bottom:12px;
}
.tab-btn{
  flex:1;padding:5px 4px;border:none;border-radius:7px;
  font-size:11px;font-weight:700;cursor:pointer;
  background:transparent;color:#64748b;transition:all .15s;font-family:inherit;
}
.tab-btn.on{background:#fff;color:#4338ca;box-shadow:0 1px 3px rgba(0,0,0,.08)}

.field{margin-bottom:9px}
.lbl{
  display:block;font-size:10px;font-weight:700;color:#64748b;
  text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;
}
.inp,.sel{
  width:100%;padding:6px 9px;
  border:1.5px solid #e2e8f0;border-radius:8px;
  font-size:12px;color:#1e293b;background:#f8fafc;
  outline:none;transition:border-color .15s;font-family:inherit;
  -webkit-appearance:none;
}
.inp:focus,.sel:focus{border-color:#6366f1;background:#fff}

.row{display:flex;gap:7px}
.row .field{flex:1}

.pri-row{display:flex;gap:5px}
.pri-btn{
  flex:1;padding:4px;border:1.5px solid #e2e8f0;border-radius:7px;
  font-size:11.5px;font-weight:700;cursor:pointer;
  background:#fff;color:#64748b;transition:all .15s;font-family:inherit;
}
.pri-btn.on{border-color:#6366f1;background:#eef2ff;color:#4338ca}

.submit-task{
  width:100%;padding:8px;background:#6366f1;color:#fff;
  border:none;border-radius:9px;font-size:13px;font-weight:700;
  cursor:pointer;margin-top:10px;transition:background .15s;font-family:inherit;
}
.submit-task:hover:not(:disabled){background:#4f46e5}
.submit-study{
  width:100%;padding:8px;background:#0891b2;color:#fff;
  border:none;border-radius:9px;font-size:13px;font-weight:700;
  cursor:pointer;margin-top:10px;transition:background .15s;font-family:inherit;
}
.submit-study:hover:not(:disabled){background:#0e7490}
.submit-task:disabled,.submit-study:disabled{opacity:.55;cursor:not-allowed}

.pane{display:none}
.pane.active{display:block}

.msg{
  margin-top:8px;padding:7px 10px;border-radius:7px;
  font-size:12px;text-align:center;display:none;
}
.msg.ok{background:#dcfce7;color:#166534;display:block}
.msg.err{background:#fee2e2;color:#991b1b;display:block}
</style>

<div id="root">
  <!-- Prompt -->
  <div id="prompt">
    <span class="icon">📚</span>
    <div class="prompt-body">
      <div class="prompt-title">Save this page?</div>
      <div class="prompt-sub">${escHtml(meta.topic.slice(0, 45))}</div>
    </div>
    <div class="prompt-actions">
      <button class="btn-task"  id="open-task">✅ Task</button>
      <button class="btn-study" id="open-study">📚 Study</button>
    </div>
    <button class="btn-x" id="no" title="Dismiss">×</button>
  </div>

  <!-- Full form (shown after clicking either prompt button) -->
  <div id="form-wrap">
    <div class="form-head">
      <div class="form-title" id="form-title-label"><span>📚</span> Save Page</div>
      <button class="btn-x" id="form-close" title="Close">×</button>
    </div>

    <!-- Tab row -->
    <div class="tab-row">
      <button class="tab-btn on" id="tab-task"  data-tab="task">✅ Task</button>
      <button class="tab-btn"   id="tab-study" data-tab="study">📚 Study</button>
    </div>

    <!-- Task pane -->
    <div class="pane active" id="pane-task">
      <div class="field">
        <label class="lbl">Task Title</label>
        <input class="inp" id="inp-title" type="text"
          value="${escHtml(meta.topic.slice(0, 120))}"
          placeholder="What do you need to do?" />
      </div>
      <div class="row">
        <div class="field">
          <label class="lbl">📅 Date</label>
          <input class="inp" id="inp-date" type="date" value="${todayISO()}" />
        </div>
        <div class="field">
          <label class="lbl">⏰ Time</label>
          <input class="inp" id="inp-time" type="time" value="${defaultTime()}" />
        </div>
      </div>
      <div class="field">
        <label class="lbl">Priority</label>
        <div class="pri-row" id="task-pri-row">
          <button class="pri-btn"    data-p="1">Low</button>
          <button class="pri-btn on" data-p="2">Medium</button>
          <button class="pri-btn"    data-p="3">High</button>
        </div>
      </div>
      <button class="submit-task" id="submit-task">Save Task</button>
    </div>

    <!-- Study pane -->
    <div class="pane" id="pane-study">
      <div class="field">
        <label class="lbl">Study Title</label>
        <input class="inp" id="inp-study-title" type="text"
          value="${escHtml(meta.topic.slice(0, 120))}"
          placeholder="e.g. Machine Learning with Python" />
      </div>
      <div class="row">
        <div class="field">
          <label class="lbl">Type</label>
          <select class="sel" id="inp-study-type">
            <option value="course">Course</option>
            <option value="book">Book</option>
            <option value="subject">Subject</option>
            <option value="language">Language</option>
          </select>
        </div>
        <div class="field">
          <label class="lbl">Est. Hours</label>
          <input class="inp" id="inp-study-hours" type="number" min="1" max="9999" value="10" />
        </div>
      </div>
      <div class="field">
        <label class="lbl">Priority</label>
        <div class="pri-row" id="study-pri-row">
          <button class="pri-btn"    data-sp="1">Low</button>
          <button class="pri-btn on" data-sp="2">Medium</button>
          <button class="pri-btn"    data-sp="3">High</button>
        </div>
      </div>
      <button class="submit-study" id="submit-study">Add to Study Scheduler</button>
    </div>

    <div class="msg" id="msg"></div>
  </div>
</div>`;

  // ── Wire events ─────────────────────────────────────────────────────────────
  let taskPriority  = 2;
  let studyPriority = 2;

  function switchTab(tab) {
    shadow.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('on'));
    shadow.querySelector(`[data-tab="${tab}"]`).classList.add('on');
    shadow.getElementById('pane-task').classList.toggle('active',  tab === 'task');
    shadow.getElementById('pane-study').classList.toggle('active', tab === 'study');
  }

  shadow.getElementById('tab-task').onclick  = () => switchTab('task');
  shadow.getElementById('tab-study').onclick = () => switchTab('study');

  shadow.getElementById('open-task').onclick = () => {
    shadow.getElementById('prompt').style.display    = 'none';
    shadow.getElementById('form-wrap').style.display = 'block';
    switchTab('task');
    shadow.getElementById('inp-title').focus();
  };

  shadow.getElementById('open-study').onclick = () => {
    shadow.getElementById('prompt').style.display    = 'none';
    shadow.getElementById('form-wrap').style.display = 'block';
    switchTab('study');
    shadow.getElementById('inp-study-title').focus();
  };

  shadow.getElementById('no').onclick         = () => host.remove();
  shadow.getElementById('form-close').onclick = () => host.remove();

  shadow.querySelectorAll('[data-p]').forEach(btn => {
    btn.addEventListener('click', () => {
      shadow.querySelectorAll('[data-p]').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      taskPriority = Number(btn.dataset.p);
    });
  });

  shadow.querySelectorAll('[data-sp]').forEach(btn => {
    btn.addEventListener('click', () => {
      shadow.querySelectorAll('[data-sp]').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      studyPriority = Number(btn.dataset.sp);
    });
  });

  // Submit task
  shadow.getElementById('submit-task').addEventListener('click', () => {
    const title = shadow.getElementById('inp-title').value.trim();
    const date  = shadow.getElementById('inp-date').value;
    const time  = shadow.getElementById('inp-time').value || '23:59';

    if (!title) { setMsg(shadow, 'Please enter a task title', 'err'); return; }

    const btn       = shadow.getElementById('submit-task');
    btn.disabled    = true;
    btn.textContent = 'Saving…';

    const dueDate = date ? new Date(`${date}T${time}:00`).toISOString() : undefined;

    chrome.runtime.sendMessage({
      type: 'CREATE_TASK',
      data: { pageUrl: meta.url, pageTitle: meta.title, taskTitle: title, dueDate, reminderAt: dueDate, priority: taskPriority },
    }, res => {
      btn.disabled    = false;
      btn.textContent = 'Save Task';
      if (res?.success) {
        setMsg(shadow, '✓ Task saved! Check your To-Do list.', 'ok');
        setTimeout(() => host.remove(), 2500);
      } else {
        setMsg(shadow, res?.error || 'Failed — are you logged in via the extension?', 'err');
      }
    });
  });

  // Submit study item
  shadow.getElementById('submit-study').addEventListener('click', () => {
    const studyTitle     = shadow.getElementById('inp-study-title').value.trim();
    const studyType      = shadow.getElementById('inp-study-type').value;
    const hoursRaw       = parseFloat(shadow.getElementById('inp-study-hours').value);
    const estimatedHours = isNaN(hoursRaw) || hoursRaw <= 0 ? 10 : hoursRaw;

    if (!studyTitle) { setMsg(shadow, 'Please enter a study title', 'err'); return; }

    const btn       = shadow.getElementById('submit-study');
    btn.disabled    = true;
    btn.textContent = 'Saving…';

    chrome.runtime.sendMessage({
      type: 'CREATE_STUDY_ITEM',
      data: { pageUrl: meta.url, pageTitle: meta.title, studyTitle, studyType, estimatedHours, priority: studyPriority },
    }, res => {
      btn.disabled    = false;
      btn.textContent = 'Add to Study Scheduler';
      if (res?.success) {
        setMsg(shadow, '✓ Added to Study Scheduler!', 'ok');
        setTimeout(() => host.remove(), 2500);
      } else {
        setMsg(shadow, res?.error || 'Failed — are you logged in via the extension?', 'err');
      }
    });
  });
}

function setMsg(shadow, text, cls) {
  const el = shadow.getElementById('msg');
  el.textContent = text;
  el.className   = `msg ${cls}`;
}

// ── Init ───────────────────────────────────────────────────────────────────────
if (isEducational()) {
  chrome.storage.local.get(['token'], ({ token }) => {
    if (token) setTimeout(mountBanner, 2500);
  });
}

// Notify the service worker about page type for badge
chrome.runtime.sendMessage({
  type:          'PAGE_TYPE_DETECTED',
  isEducational: isEducational(),
});

// Respond to popup page-data requests
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_DATA') {
    sendResponse({ ...getPageMeta(), isEducational: isEducational() });
  }
});
