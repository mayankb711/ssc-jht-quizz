import { kvGet, kvSet } from '../store/local.js';
import { KV_KEYS, APP } from '../config/app.js';

const KEY = KV_KEYS.errorReports;

function normalizeReport(entry) {
  return {
    id: entry.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    ts: entry.ts || Date.now(),
    title: entry.title || 'Runtime error',
    message: entry.message || '',
    stack: entry.stack || '',
    url: entry.url || location.href,
    screen: entry.screen || new URLSearchParams(location.hash.replace(/^#/, '')).get('screen') || 'home',
    file: entry.file || '',
    func: entry.func || '',
    action: entry.action || '',
    source: entry.source || '',
    context: entry.context || {},
    recoverySteps: Array.isArray(entry.recoverySteps) ? entry.recoverySteps : [],
    appVersion: entry.appVersion || '',
    resolved: !!entry.resolved,
  };
}

export function notifyError(msg, duration = 4000) {
  const id = 'ntf-' + Date.now();
  const el = document.getElementById(id);
  if (el) el.remove();
  const div = document.createElement('div');
  div.id = id;
  div.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#e74c3c;color:#fff;padding:10px 20px;border-radius:8px;font-size:0.85rem;z-index:9999;max-width:90vw;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer;';
  div.textContent = msg;
  div.addEventListener('click', () => div.remove());
  document.body.appendChild(div);
  setTimeout(() => { const e = document.getElementById(id); if (e) e.remove(); }, duration);
}

export async function getReports() {
  return (await kvGet(KEY, [])) || [];
}

export async function setReports(reports) {
  await kvSet(KEY, Array.isArray(reports) ? reports.map(normalizeReport) : []);
}

export async function logError(err, extra = {}) {
  if (extra.__skipSerialize) {
    const reports = await getReports();
    const report = normalizeReport({ ...err, ...extra });
    reports.unshift(report);
    await kvSet(KEY, reports.slice(0, APP.maxErrorReports));
    return report;
  }
  const reports = await getReports();
  const message = extra.message || String(err?.message || err || 'Unknown error');
  const report = normalizeReport({
    id: extra.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    title: extra.title || (err?.name === 'AppError' ? err.name : 'Runtime error'),
    message,
    stack: extra.stack || String(err?.stack || ''),
    file: extra.file || '',
    func: extra.func || '',
    action: extra.action || '',
    source: extra.source || '',
    context: extra.context || {},
    recoverySteps: extra.recoverySteps || [],
    appVersion: extra.appVersion || '',
    url: location.href,
    screen: new URLSearchParams(location.hash.replace(/^#/, '')).get('screen') || 'unknown',
    resolved: false,
  });
  reports.unshift(report);
  await kvSet(KEY, reports.slice(0, APP.maxErrorReports));
  console.group(`%c[${report.source || 'app'}] ${report.title}${report.func ? ' at ' + report.func : ''}${report.file ? ' (' + report.file + ')' : ''}`, 'color:#e74c3c;font-weight:bold');
  if (report.message) console.error('  message:', report.message);
  if (report.stack) console.error('  stack:', report.stack.split('\n').slice(0, 4).join('\n'));
  if (Object.keys(report.context || {}).length) console.debug('  context:', report.context);
  console.groupEnd();
  return report;
}

export async function appendRecovery(reportId, step) {
  const reports = await getReports();
  const idx = reports.findIndex(r => r.id === reportId);
  if (idx >= 0) {
    reports[idx] = {
      ...reports[idx],
      recoverySteps: [...(reports[idx].recoverySteps || []), step],
    };
    await kvSet(KEY, reports);
  }
}

export async function markResolved(reportId, resolved = true) {
  const reports = await getReports();
  const idx = reports.findIndex(r => r.id === reportId);
  if (idx >= 0) {
    reports[idx] = { ...reports[idx], resolved };
    await kvSet(KEY, reports);
  }
}

export async function clearReports() {
  await kvSet(KEY, []);
}
