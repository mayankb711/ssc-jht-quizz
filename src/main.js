/*
  main.js — entry + hash router.
*/

import { kvGet } from './store/local.js';
import { configure, autoPull, getStatus } from './store/cloud.js';
import { logError, notifyError } from './core/diagnostics.js';
import { installGlobalHandlers } from './core/error.js';
import { APP, KV_KEYS, VERSION } from './config/app.js';
import { knowledgeGraph } from './learning/graph.js';
import { learningState } from './learning/state.js';
import { loadProfile } from './learning/profile.js';

import { mount as mountHome } from './ui/home.js';
import { mount as mountQuiz } from './ui/quiz.js';
import { mount as mountReview } from './ui/review.js';
import { mount as mountSettings } from './ui/settings.js';
import { mount as mountProgress } from './ui/progress.js';
import { mount as mountDiagnostics } from './ui/diagnostics.js';

const SCREENS = {
  home: mountHome,
  quiz: mountQuiz,
  review: mountReview,
  settings: mountSettings,
  progress: mountProgress,
  diagnostics: mountDiagnostics,
};

const app = document.getElementById('app');
let _cleanup = null;

installGlobalHandlers();

function showFatal(err, title = 'App error') {
  logError(err, {
    title,
    file: 'main.js',
    func: 'showFatal',
    source: 'app',
    recoverySteps: ['Retry the current screen', 'Go home to recover to the dashboard'],
  }).catch(() => {});
  const detailEl = err?.recovery?.length ? err.recovery.map(s => `<li>${esc(s)}</li>`).join('') : '';
  app.innerHTML = `
    <div class="error-container">
      <div class="ui-card error-card">
        <h2>${esc(title)}</h2>
        <p class="ui-muted">The app hit a runtime problem.</p>
        <details style="margin:12px 0;">
          <summary style="cursor:pointer;font-size:0.85rem;color:var(--text-dim);">Error details</summary>
          <pre class="error-stack">${esc(err?.stack || err?.message || String(err))}</pre>
        </details>
        ${detailEl ? `<div style="margin:8px 0;padding:8px 12px;background:var(--surface-2);border-radius:6px;font-size:0.85rem;"><strong>Suggested steps:</strong><ul style="margin:4px 0 0;padding-left:16px;">${detailEl}</ul></div>` : ''}
        <div class="ui-btn-row" style="margin-top: 12px;">
          <button class="ui-btn" id="retry">Retry</button>
          <button class="ui-btn ui-btn--secondary" id="go-diag">Diagnostics</button>
          <button class="ui-btn ui-btn--ghost" id="go-home">Home</button>
        </div>
      </div>
    </div>`;
  document.getElementById('retry')?.addEventListener('click', () => location.reload());
  document.getElementById('go-home')?.addEventListener('click', () => { location.hash = 'screen=home'; });
  document.getElementById('go-diag')?.addEventListener('click', () => { location.hash = 'screen=diagnostics'; });
}

async function initTheme() {
  const theme = await kvGet(KV_KEYS.theme, APP.defaultTheme);
  document.documentElement.setAttribute('data-theme', theme || APP.defaultTheme);
  document.title = `${APP.name} - ${APP.subtitle}`;
  await configure();
  await autoPull().catch(() => {});
  await loadProfile().catch(() => {});
  await knowledgeGraph.init().catch(() => {});
  learningState.reset();
}

function topbar(title, sub) {
  const st = getStatus();
  const connDot = st.configured ? (st.online ? '🟢' : '🔴') : '';
  const connTitle = st.configured ? (st.online ? 'Cloud connected' : 'Offline mode') : '';
  const errDot = st.lastSyncError ? '<span class="ui-conn-dot" title="Sync error: ' + esc(st.lastSyncError) + '" style="color:var(--warn);">⚠️</span>' : '';
  return `
    <div class="ui-topbar">
      <div class="ui-brand">${title}${sub ? `<span class="sub">${sub}</span>` : ''}</div>
      <div class="ui-topbar__nav">
        ${connDot}
        ${errDot}
        <button class="ui-nav-btn" data-go="diagnostics" title="Diagnostics"><span class="ui-nav-btn__icon">🔍</span> Diag</button>
        <button class="ui-nav-btn" data-go="progress" title="Progress"><span class="ui-nav-btn__icon">📊</span> Progress</button>
        <button class="ui-nav-btn" data-go="settings" title="Settings"><span class="ui-nav-btn__icon">⚙️</span> Settings</button>
      </div>
    </div>`;
}

async function render() {
  try {
    const hash = location.hash.replace(/^#/, '');

    // If the hash contains Supabase auth tokens, don't route â€” let Supabase
    // recover the session, then clean the URL and go home.
    if (hash.includes('access_token') || hash.includes('type=recovery')) {
      await configure();
      history.replaceState(null, '', window.location.pathname);
      location.hash = 'screen=home';
      return;
    }

    const params = new URLSearchParams(hash);
    const name = params.get('screen') || 'home';
    const Screen = SCREENS[name] || SCREENS.home;
    if (_cleanup) try { _cleanup(); } catch {}

    const wrap = document.createElement('div');
    wrap.className = 'ui-page';
    app.innerHTML = '';
    app.appendChild(wrap);

    wrap.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const go = target?.closest('[data-go]')?.getAttribute('data-go');
      if (go) location.hash = `screen=${go}`;
    });

    _cleanup = await Screen(wrap, params, {
      topbar,
      go: (n, extra) => {
        let h = `screen=${n}`;
        if (extra) for (const k in extra) h += `&${k}=${encodeURIComponent(extra[k])}`;
        location.hash = h;
      },
    });
  } catch (err) {
    showFatal(err);
  }
}

window.addEventListener('hashchange', render);

// Handle PKCE / implicit magic-link redirect before normal init
const initHash = location.hash;
const hasPKCECode = new URLSearchParams(window.location.search).has('code');
const hasImplicitTokens = initHash.includes('access_token') || initHash.includes('type=recovery');

if (hasImplicitTokens || hasPKCECode) {
  initTheme().then(() => {
    history.replaceState(null, '', window.location.pathname);
    location.hash = 'screen=home';
    render();
  }).catch((err) => showFatal(err, 'Startup error'));
} else {
  initTheme().then(render).catch((err) => showFatal(err, 'Startup error'));
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
