import { kvGet, kvSet } from '../store/local.js';

const KEY = 'error_reports';

function normalizeReport(entry) {
  return {
    id: entry.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    ts: entry.ts || Date.now(),
    title: entry.title || 'Runtime error',
    message: entry.message || '',
    stack: entry.stack || '',
    url: entry.url || location.href,
    screen: entry.screen || new URLSearchParams(location.hash.replace(/^#/, '')).get('screen') || 'home',
    recoverySteps: Array.isArray(entry.recoverySteps) ? entry.recoverySteps : [],
    resolved: !!entry.resolved,
  };
}

export async function getReports() {
  return (await kvGet(KEY, [])) || [];
}

export async function setReports(reports) {
  await kvSet(KEY, Array.isArray(reports) ? reports.map(normalizeReport) : []);
}

export async function logError(err, extra = {}) {
  const reports = await getReports();
  const report = normalizeReport({
    title: extra.title || 'Runtime error',
    message: extra.message || String(err?.message || err || 'Unknown error'),
    stack: extra.stack || String(err?.stack || ''),
    recoverySteps: extra.recoverySteps || [],
    ...extra,
  });
  reports.unshift(report);
  await kvSet(KEY, reports.slice(0, 100));
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
