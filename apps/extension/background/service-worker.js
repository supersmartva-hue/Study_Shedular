/**
 * Background service worker.
 *
 * All API calls are made here so tokens never touch content scripts.
 *
 * Configuration (set via Options page → chrome.storage.sync):
 *   apiBase  — API server URL, e.g. "https://api.example.com" (default: http://localhost:4000)
 *   appUrl   — Web app URL, e.g. "https://app.example.com"    (default: http://localhost:3000)
 *
 * Messages handled:
 *   CREATE_TASK         — POST /api/extension/capture → Task
 *   CREATE_STUDY_ITEM   — POST /api/extension/study-capture → StudyItem
 *   SAVE_TOKEN          — persist JWT to chrome.storage.local
 *   CLEAR_TOKEN         — remove JWT
 *   PAGE_TYPE_DETECTED  — update badge colour & text for the active tab
 *   GET_CONFIG          — return { apiBase, appUrl } to popup/content script
 */

const DEFAULTS = {
  apiBase: 'https://smart-productivity-api-2bkn.onrender.com',
  appUrl:  'https://smart-productivity-khaki.vercel.app',
};

// ── Config helper ──────────────────────────────────────────────────────────────
function getConfig() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['apiBase', 'appUrl'], items => {
      resolve({
        apiBase: items.apiBase || DEFAULTS.apiBase,
        appUrl:  items.appUrl  || DEFAULTS.appUrl,
      });
    });
  });
}

// ── Badge ──────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'PAGE_TYPE_DETECTED' && sender.tab?.id) {
    const edu = msg.isEducational;
    chrome.action.setBadgeText({
      text:  edu ? '📚' : '',
      tabId: sender.tab.id,
    });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1', tabId: sender.tab.id });
  }
});

// ── API helper ─────────────────────────────────────────────────────────────────
async function apiPost(apiBase, path, body, token) {
  const res = await fetch(`${apiBase}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

async function apiGet(apiBase, path, token) {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

// ── Message router ─────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {

  // ── Return current config to popup / content script ────────────────────────
  if (msg.type === 'GET_CONFIG') {
    getConfig().then(cfg => sendResponse({ success: true, data: cfg }));
    return true;
  }

  // ── Create task (To-Do) ────────────────────────────────────────────────────
  if (msg.type === 'CREATE_TASK') {
    Promise.all([
      getConfig(),
      new Promise(r => chrome.storage.local.get(['token'], r)),
    ]).then(async ([cfg, stored]) => {
      const token = stored.token;
      if (!token) {
        sendResponse({ success: false, error: 'Not signed in. Open the extension popup and connect your account.' });
        return;
      }
      try {
        const json = await apiPost(cfg.apiBase, '/api/extension/capture', msg.data, token);
        sendResponse({ success: true, data: json.data });
        chrome.notifications.create({
          type:    'basic',
          iconUrl: '../icons/icon48.png',
          title:   'Task Saved!',
          message: `"${msg.data.taskTitle}" added to your To-Do list.`,
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }

  if (msg.type === 'GET_TASKS') {
    Promise.all([
      getConfig(),
      new Promise(r => chrome.storage.local.get(['token'], r)),
    ]).then(async ([cfg, stored]) => {
      if (!stored.token) {
        sendResponse({ success: false, error: 'Not signed in.' });
        return;
      }
      try {
        const json = await apiGet(cfg.apiBase, '/api/tasks', stored.token);
        sendResponse({ success: true, data: json.data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }

  // ── Create study item (Study Scheduler) ────────────────────────────────────
  if (msg.type === 'CREATE_STUDY_ITEM') {
    Promise.all([
      getConfig(),
      new Promise(r => chrome.storage.local.get(['token'], r)),
    ]).then(async ([cfg, stored]) => {
      const token = stored.token;
      if (!token) {
        sendResponse({ success: false, error: 'Not signed in. Open the extension popup and connect your account.' });
        return;
      }
      try {
        const json = await apiPost(cfg.apiBase, '/api/extension/study-capture', msg.data, token);
        sendResponse({ success: true, data: json.data });
        chrome.notifications.create({
          type:    'basic',
          iconUrl: '../icons/icon48.png',
          title:   'Study Item Saved!',
          message: `"${msg.data.studyTitle}" added to your Study Scheduler.`,
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }

  // ── Save auth token ────────────────────────────────────────────────────────
  if (msg.type === 'SAVE_TOKEN') {
    chrome.storage.local.set({ token: msg.token }, () =>
      sendResponse({ success: true }),
    );
    return true;
  }

  // ── Clear auth token ───────────────────────────────────────────────────────
  if (msg.type === 'CLEAR_TOKEN') {
    chrome.storage.local.remove('token', () =>
      sendResponse({ success: true }),
    );
    return true;
  }
});
