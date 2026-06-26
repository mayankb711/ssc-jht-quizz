/* ============================================================
   main.js - entry + hash router.
   ============================================================ */

import { kvGet } from './store/local.js';
import { configure as sbConfigure } from './store/supabase.js';
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
    <div style="padding:24px;">
      <div class="card">
        <h2>${title}</h2>
        <p class="muted">The app hit a runtime problem while loading.</p>
        <pre style="white-space:pre-wrap;overflow:auto;background:var(--surface-2);padding:12px;border-radius:10px;border:1px solid var(--border);">${String(err?.stack || err?.message || err)}</pre>
        <div class="btn-row" style="margin-top:12px;">
          <button class="btn" id="retry">Retry</button>
          <button class="btn secondary" id="home">Go home</button>
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
}

function topbar(title, sub) {
  return `
    <div class="topbar">
      <div class="brand">${title}${sub ? `<span class="sub">${sub}</span>` : ''}</div>
      <div style="display:flex; gap:8px;">
        <button class="icon-btn" data-go="diagnostics" title="Diagnostics">!</button>
        <button class="icon-btn" data-go="progress" title="Progress">%</button>
        <button class="icon-btn" data-go="settings" title="Settings">=</button>
      </div>
    </div>`;
}

async function render() {
  try {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const name = params.get('screen') || 'home';
    const Screen = SCREENS[name] || SCREENS.home;
    if (_cleanup) try { _cleanup(); } catch {}

    const wrap = document.createElement('div');
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
initTheme().then(render).catch((err) => showFatal(err, 'Startup error'));
