import { allAttempts, allGeneratedQuestions, kvGet, kvSet, replaceAttempts } from '../store/local.js';
import { getReports } from './diagnostics.js';
import { QUESTIONS } from '../data/questions.js';

export async function exportBackupPayload() {
  return {
    v: 2,
    exportedAt: new Date().toISOString(),
    attempts: await allAttempts(),
    generatedQuestions: await allGeneratedQuestions(),
    errorReports: await getReports(),
    settings: {
      theme: await kvGet('theme', 'dark'),
      cf_account: await kvGet('cf_account', ''),
      cf_token: await kvGet('cf_token', ''),
      cf_model: await kvGet('cf_model', '@cf/meta/llama-3-8b-instruct'),
      neuron_cap: await kvGet('neuron_cap', 8000),
      sb_url: await kvGet('sb_url', ''),
      sb_key: await kvGet('sb_key', ''),
    },
    sourceCounts: {
      curatedQuestions: QUESTIONS.length,
    },
  };
}

export async function downloadBackup() {
  const payload = await exportBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sscjht-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid backup file');

  const settings = payload.settings || {};
  if (settings.theme) await kvSet('theme', settings.theme);
  if (settings.cf_account != null) await kvSet('cf_account', String(settings.cf_account));
  if (settings.cf_token != null) await kvSet('cf_token', String(settings.cf_token));
  if (settings.cf_model != null) await kvSet('cf_model', String(settings.cf_model));
  if (settings.neuron_cap != null) await kvSet('neuron_cap', Number(settings.neuron_cap) || 8000);
  if (settings.sb_url != null) await kvSet('sb_url', String(settings.sb_url));
  if (settings.sb_key != null) await kvSet('sb_key', String(settings.sb_key));

  const imported = {
    attempts: Array.isArray(payload.attempts) ? payload.attempts.length : 0,
    generatedQuestions: Array.isArray(payload.generatedQuestions) ? payload.generatedQuestions.length : 0,
    errorReports: Array.isArray(payload.errorReports) ? payload.errorReports.length : 0,
  };

  // We intentionally keep this import lightweight and forward-compatible.
  // Existing stores are left intact; imported data is merged by writing the
  // latest available copies into the shared stores.
  if (Array.isArray(payload.attempts)) {
    await replaceAttempts(payload.attempts);
  }

  if (Array.isArray(payload.generatedQuestions)) {
    const { upsertGeneratedQuestion } = await import('../store/local.js');
    for (const q of payload.generatedQuestions) {
      if (q && q.id) await upsertGeneratedQuestion(q);
    }
  }

  if (Array.isArray(payload.errorReports)) {
    const { setReports } = await import('./diagnostics.js');
    await setReports(payload.errorReports);
  }

  return imported;
}
