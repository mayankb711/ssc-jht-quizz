/*
  main.js — entry + hash router.
*/

import { kvGet } from './store/local.js';
import { configure as sbConfigure, autoPull, getStatus as sbStatus } from './store/supabase.js';
import { logError } from './core/diagnostics.js';
import { APP } from './config/app.js';

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

function showFatal(err, title = 'App error') {
  console.error(err);
  logError(err, {
    title,
    recoverySteps: ['Captured at app-level error boundary', 'Retry the current screen', 'Go home to recover to the dashboard'],
  }).catch(() => {});
  app.innerHTML = `
    <div class="error-container">
      <div class="ui-card error-card">
        <h2>${title}</h2>
        <p class="ui-muted">The app hit a runtime problem while loading.</p>
        <pre class="error-stack">${String(err?.stack || err?.message || err)}</pre>
        <div class="ui-btn-row" style="margin-top: 12px;">
          <button class="ui-btn" id="retry">Retry</button>
          <button class="ui-btn ui-btn--secondary" id="home">Go home</button>
        </div>
      </div>
    </div>`;
  document.getElementById('retry')?.addEventListener('click', render);
  document.getElementById('home')?.addEventListener('click', () => { location.hash = 'screen=home'; });
}

async function initTheme() {
  const theme = await kvGet('theme', 'dark');
  document.documentElement.setAttribute('data-theme', theme || 'dark');
  document.title = `${APP.name} - ${APP.subtitle}`;
  await sbConfigure();
  // auto-pull cloud data if signed in (best-effort, offline-first)
  autoPull().catch(() => {});
}

function topbar(title, sub) {
  const st = sbStatus();
  const connDot = st.configured ? (st.online ? '🟢' : '🔴') : '';
  const connTitle = st.configured ? (st.online ? 'Cloud connected' : 'Offline mode') : '';
  return `
    <div class="ui-topbar">
      <div class="ui-brand">${title}${sub ? `<span class="sub">${sub}</span>` : ''}</div>
      <div class="ui-topbar__nav">
        ${connDot ? `<span class="ui-conn-dot" title="${connTitle}">${connDot}</span>` : ''}
        <button class="ui-nav-btn" data-go="diagnostics" title="Diagnostics"><span class="ui-nav-btn__icon">🔍</span> Diag</button>
        <button class="ui-nav-btn" data-go="progress" title="Progress"><span class="ui-nav-btn__icon">📊</span> Progress</button>
        <button class="ui-nav-btn" data-go="settings" title="Settings"><span class="ui-nav-btn__icon">⚙️</span> Settings</button>
      </div>
    </div>`;
}

async function render() {
  try {
    const hash = location.hash.replace(/^#/, '');

    // If the hash contains Supabase auth tokens, don't route — let Supabase
    // recover the session, then clean the URL and go home.
    if (hash.includes('access_token') || hash.includes('type=recovery')) {
      await sbConfigure();
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
window.addEventListener('error', (e) => showFatal(e.error || e.message, 'Unhandled error'));
window.addEventListener('unhandledrejection', (e) => showFatal(e.reason, 'Unhandled rejection'));

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
