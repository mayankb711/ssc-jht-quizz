import { logError as _logError } from './diagnostics.js';
import { KV_KEYS, VERSION } from '../config/app.js';

let _idCounter = 0;
function nextId() {
  _idCounter++;
  return 'err_' + Date.now().toString(36) + '_' + _idCounter + '_' + Math.random().toString(36).slice(2, 6);
}

function formatTime(ts) {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19);
}

export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = options.name || 'AppError';
    this.timestamp = options.timestamp || Date.now();
    this.id = options.id || nextId();
    this.file = options.file || '';
    this.func = options.func || '';
    this.action = options.action || '';
    this.cause = options.cause || null;
    this.context = options.context || {};
    this.recovery = options.recovery || [];
    this.source = options.source || '';
  }
}

export function serializeError(err, context = {}) {
  if (err instanceof AppError) {
    return {
      id: err.id,
      ts: err.timestamp,
      title: err.name,
      message: err.message,
      stack: err.stack || '',
      file: err.file,
      func: err.func,
      action: err.action,
      source: err.source,
      context: { ...err.context, ...context },
      recoverySteps: err.recovery,
      url: location.href,
      screen: new URLSearchParams(location.hash.replace(/^#/, '')).get('screen') || 'unknown',
      appVersion: VERSION.app,
      resolved: false,
    };
  }
  const isNetwork = err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('NetworkError'));
  return {
    id: nextId(),
    ts: Date.now(),
    title: isNetwork ? 'Network error' : 'Runtime error',
    message: String(err?.message || err || 'Unknown error'),
    stack: String(err?.stack || ''),
    file: context.file || '',
    func: context.func || '',
    action: context.action || '',
    source: context.source || (isNetwork ? 'network' : ''),
    context,
    recoverySteps: isNetwork ? ['Check your internet connection', 'The app works offline — data is stored locally', 'Try again when connected'] : [],
    url: location.href,
    screen: new URLSearchParams(location.hash.replace(/^#/, '')).get('screen') || 'unknown',
    appVersion: VERSION.app,
    resolved: false,
  };
}

export function formatErrorForDisplay(report) {
  const parts = [];
  if (report.title) parts.push(report.title);
  if (report.message) parts.push(report.message);
  if (report.file && report.func) parts.push(`at ${report.func} (${report.file})`);
  else if (report.func) parts.push(`at ${report.func}`);
  else if (report.file) parts.push(`in ${report.file}`);
  if (report.action) parts.push(`during: ${report.action}`);
  if (report.source) parts.push(`source: ${report.source}`);
  if (report.ts) parts.push(formatTime(report.ts));
  if (report.recoverySteps?.length) parts.push('---', 'Recovery:', report.recoverySteps.map((s, i) => `${i + 1}. ${s}`).join('\n'));
  return parts.join('\n');
}

export function consoleError(report) {
  const prefix = `[${report.source || 'app'}]`;
  const loc = report.file ? ` (${report.func ? report.func + '@' : ''}${report.file})` : '';
  console.group(`%c${prefix} ${report.title}${loc}`, 'color: #e74c3c; font-weight: bold');
  if (report.message) console.error('Message:', report.message);
  if (report.stack) console.error('Stack:', report.stack);
  if (Object.keys(report.context || {}).length) console.debug('Context:', report.context);
  if (report.recoverySteps?.length) console.info('Recovery:', report.recoverySteps);
  console.groupEnd();
}

export async function logError(err, extra = {}) {
  const report = serializeError(err, extra);
  consoleError(report);
  try {
    await _logError(report, { ...extra, __skipSerialize: true });
  } catch (_) {}
  return report;
}

export function withErrorBoundary(fn, options = {}) {
  return async function (...args) {
    try {
      return await fn.apply(this, args);
    } catch (err) {
      const report = await logError(err, {
        file: options.file || '',
        func: options.func || fn.name || 'anonymous',
        action: options.action || '',
        source: options.source || 'ui',
        recoverySteps: options.recovery || [],
      });
      if (typeof options.fallback === 'function') {
        return options.fallback(err, report);
      }
      if (options.rethrow !== false) throw err;
      return undefined;
    }
  };
}

export function withErrorBoundarySync(fn, options = {}) {
  return function (...args) {
    try {
      return fn.apply(this, args);
    } catch (err) {
      const report = serializeError(err, {
        file: options.file || '',
        func: options.func || fn.name || 'anonymous',
        action: options.action || '',
        source: options.source || 'ui',
      });
      consoleError(report);
      try { _logError(report, { __skipSerialize: true }).catch(() => {}); } catch (_) {}
      if (typeof options.fallback === 'function') return options.fallback(err, report);
      if (options.rethrow !== false) throw err;
      return undefined;
    }
  };
}

export function notifyError(msg, duration = 4000) {
  const id = 'err-toast-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#e74c3c;color:#fff;padding:10px 20px;border-radius:8px;font-size:0.85rem;z-index:9999;max-width:90vw;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer;';
  el.textContent = msg;
  el.addEventListener('click', () => el.remove());
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export function installGlobalHandlers() {
  if (window.__errorHandlersInstalled) return;
  window.__errorHandlersInstalled = true;

  window.addEventListener('error', (e) => {
    const report = serializeError(e.error || e.message, {
      source: 'window',
      action: 'global error handler',
      recoverySteps: ['Check the Diagnostics screen for details', 'Reload the page if the issue persists'],
    });
    consoleError(report);
    try { _logError(report, { __skipSerialize: true }).catch(() => {}); } catch (_) {}

    const fatalEl = document.querySelector('.error-container');
    if (!fatalEl) {
      showFatalCard(e.error || e.message, 'Unhandled error', report);
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const report = serializeError(e.reason, {
      source: 'promise',
      action: 'unhandled promise rejection',
      recoverySteps: ['Check the Diagnostics screen for details', 'Reload the page if the issue persists'],
    });
    consoleError(report);
    try { _logError(report, { __skipSerialize: true }).catch(() => {}); } catch (_) {}

    const fatalEl = document.querySelector('.error-container');
    if (!fatalEl) {
      showFatalCard(e.reason, 'Unhandled rejection', report);
    }
  });
}

function showFatalCard(err, title, report) {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="error-container">
      <div class="ui-card error-card">
        <h2>${esc(title)}</h2>
        <p class="ui-muted">The app hit a runtime problem.</p>
        ${report?.recoverySteps?.length ? `
          <div style="margin:12px 0;padding:10px;background:var(--surface-2);border-radius:6px;">
            <strong>Try:</strong>
            <ul style="margin:6px 0 0;padding-left:18px;">
              ${report.recoverySteps.map(s => `<li style="font-size:0.85rem;margin-bottom:4px;">${esc(s)}</li>`).join('')}
            </ul>
          </div>` : ''}
        <details style="margin:12px 0;">
          <summary style="cursor:pointer;font-size:0.85rem;color:var(--text-dim);">Error details</summary>
          <pre class="error-stack">${esc(report ? formatErrorForDisplay(report) : String(err?.stack || err?.message || err || 'Unknown'))}</pre>
        </details>
        <div class="ui-btn-row" style="margin-top: 12px;">
          <button class="ui-btn" id="retry">Retry</button>
          <button class="ui-btn ui-btn--secondary" id="go-diagnostics">View diagnostics</button>
          <button class="ui-btn ui-btn--ghost" id="go-home">Home</button>
        </div>
      </div>
    </div>`;
  document.getElementById('retry')?.addEventListener('click', () => location.reload());
  document.getElementById('go-home')?.addEventListener('click', () => { location.hash = 'screen=home'; });
  document.getElementById('go-diagnostics')?.addEventListener('click', () => { location.hash = 'screen=diagnostics'; });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
