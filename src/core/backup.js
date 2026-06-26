import { allAttempts, allGeneratedQuestions, kvGet, kvSet, replaceAttempts } from '../store/local.js';
import { getReports, logError } from './diagnostics.js';
import { APP, KV_KEYS, VERSION } from '../config/app.js';
import { QUESTIONS } from '../data/questions.js';

export async function exportBackupPayload() {
  try {
    return {
      v: VERSION.backup,
      exportedAt: new Date().toISOString(),
      attempts: await allAttempts(),
      generatedQuestions: await allGeneratedQuestions(),
      errorReports: await getReports(),
      settings: {
        [KV_KEYS.theme]: await kvGet(KV_KEYS.theme, APP.defaultTheme),
        [KV_KEYS.cfAccount]: await kvGet(KV_KEYS.cfAccount, ''),
        [KV_KEYS.cfToken]: await kvGet(KV_KEYS.cfToken, ''),
        [KV_KEYS.cfModel]: await kvGet(KV_KEYS.cfModel, '@cf/meta/llama-3-8b-instruct'),
        [KV_KEYS.neuronCap]: await kvGet(KV_KEYS.neuronCap, APP.defaultNeuronCap),
        [KV_KEYS.fbProjectId]: await kvGet(KV_KEYS.fbProjectId, ''),
        [KV_KEYS.fbApiKey]: await kvGet(KV_KEYS.fbApiKey, ''),
      },
      sourceCounts: { curatedQuestions: QUESTIONS.length },
    };
  } catch (e) {
    logError(e, { file: 'backup.js', func: 'exportBackupPayload', source: 'core', action: 'export backup' });
    throw e;
  }
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
  if (!payload || typeof payload !== 'object') {
    const err = new Error('Invalid backup file');
    logError(err, { file: 'backup.js', func: 'importBackupPayload', source: 'core', action: 'validate backup payload' });
    throw err;
  }

  const settings = payload.settings || {};
  const kvWrites = [
    [KV_KEYS.theme, settings.theme],
    [KV_KEYS.cfAccount, settings.cf_account],
    [KV_KEYS.cfToken, settings.cf_token],
    [KV_KEYS.cfModel, settings.cf_model],
    [KV_KEYS.neuronCap, settings.neuron_cap],
    [KV_KEYS.fbProjectId, settings.fb_project_id],
    [KV_KEYS.fbApiKey, settings.fb_api_key],
  ];
  for (const [key, val] of kvWrites) {
    if (val != null) {
      try { await kvSet(key, val); } catch (e) {
        logError(e, { file: 'backup.js', func: 'importBackupPayload', source: 'core', action: 'import setting ' + key });
      }
    }
  }

  const imported = {
    attempts: Array.isArray(payload.attempts) ? payload.attempts.length : 0,
    generatedQuestions: Array.isArray(payload.generatedQuestions) ? payload.generatedQuestions.length : 0,
    errorReports: Array.isArray(payload.errorReports) ? payload.errorReports.length : 0,
  };

  if (Array.isArray(payload.attempts)) {
    try { await replaceAttempts(payload.attempts); } catch (e) {
      logError(e, { file: 'backup.js', func: 'importBackupPayload', source: 'core', action: 'replace attempts from backup' });
    }
  }

  if (Array.isArray(payload.generatedQuestions)) {
    const { upsertGeneratedQuestion, allGeneratedQuestions, kvSet } = await import('../store/local.js');
    const existingIds = new Set((await allGeneratedQuestions()).map(q => q.id));
    const importedIds = new Set(payload.generatedQuestions.map(q => q.id));
    for (const q of payload.generatedQuestions) {
      if (q && q.id) {
        try { await upsertGeneratedQuestion(q); } catch (e) {
          logError(e, { file: 'backup.js', func: 'importBackupPayload', source: 'core', action: 'import generated question ' + q.id });
        }
      }
    }
  }

  if (Array.isArray(payload.errorReports)) {
    try {
      const { setReports } = await import('./diagnostics.js');
      await setReports(payload.errorReports);
    } catch (e) {
      logError(e, { file: 'backup.js', func: 'importBackupPayload', source: 'core', action: 'import error reports' });
    }
  }

  return imported;
}
