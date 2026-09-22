const DEFAULTS = {
  apiBase: 'https://smart-productivity-api-2bkn.onrender.com',
  appUrl:  'https://smart-productivity-khaki.vercel.app',
};

const $ = id => document.getElementById(id);

function showMsg(text, type) {
  const el = $('msg');
  el.textContent = text;
  el.className   = `msg ${type}`;
}

// Load saved values on startup
chrome.storage.sync.get(['apiBase', 'appUrl'], items => {
  $('inp-api').value = items.apiBase || DEFAULTS.apiBase;
  $('inp-app').value = items.appUrl  || DEFAULTS.appUrl;
});

$('btn-save').addEventListener('click', () => {
  const apiBase = $('inp-api').value.trim().replace(/\/$/, '');
  const appUrl  = $('inp-app').value.trim().replace(/\/$/, '');

  if (!apiBase || !appUrl) {
    showMsg('Both fields are required.', 'err');
    return;
  }

  try {
    new URL(apiBase);
    new URL(appUrl);
  } catch {
    showMsg('Please enter valid URLs (include http:// or https://).', 'err');
    return;
  }

  chrome.storage.sync.set({ apiBase, appUrl }, () => {
    showMsg('Settings saved!', 'ok');
    setTimeout(() => { $('msg').className = 'msg'; }, 3000);
  });
});

$('btn-reset').addEventListener('click', () => {
  chrome.storage.sync.set(DEFAULTS, () => {
    $('inp-api').value = DEFAULTS.apiBase;
    $('inp-app').value = DEFAULTS.appUrl;
    showMsg('Reset to defaults.', 'ok');
    setTimeout(() => { $('msg').className = 'msg'; }, 3000);
  });
});
