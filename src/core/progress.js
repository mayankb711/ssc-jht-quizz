/* ============================================================
   progress.js — records attempts, computes scores, streaks, and
   per-topic mastery summaries shown on Home/Progress screens.
   ============================================================ */

import { allAttempts, addAttempt, kvGet, kvSet } from '../store/local.js';
import { push as sbPush } from '../store/supabase.js';

let _idc = 0;
function newId() { _idc++; return `${Date.now().toString(36)}-${_idc}-${Math.random().toString(36).slice(2,7)}`; }

/** Record one answer. Returns the attempt object. */
export async function record({ question, chosen, mode }) {
  const correct = chosen === question.answer;
  const attempt = {
    id: newId(),
    question_id: question.id,
    topic: question.topic,
    skill: question.skill || null,
    correct,
    chosen,
    ts: Date.now(),
    mode: mode || 'practice',
  };
  await addAttempt(attempt);
  // best-effort cloud push; failures are silent (offline-first)
  sbPush().catch(() => {});
  return attempt;
}

// ---- scoring ----
export const NEGATIVE = 0.25;   // −0.25 per wrong, per real SSC JHT rules
export function scoreSession(attempts) {
  let correct = 0, wrong = 0, unattempted = 0;
  for (const a of attempts) {
    if (a.chosen == null) unattempted++;
    else if (a.correct) correct++;
    else wrong++;
  }
  const marks = correct - NEGATIVE * wrong;
  return { correct, wrong, unattempted, marks, total: attempts.length };
}

// ---- aggregate stats for Home screen ----
export async function summary() {
  const attempts = await allAttempts();
  if (!attempts.length) {
    return { total: 0, accuracy: 0, streakDays: 0, topics: [] };
  }
  const correct = attempts.filter(a => a.correct).length;
  const accuracy = correct / attempts.length;

  // day streak (consecutive days with >=1 attempt, ending today/yesterday)
  const days = new Set(attempts.map(a => new Date(a.ts).toDateString()));
  let streak = 0;
  let d = new Date();
  // allow streak to count from today OR yesterday start
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }

  // per-topic accuracy
  const tmap = new Map();
  for (const a of attempts) {
    const e = tmap.get(a.topic) || { topic: a.topic, correct: 0, total: 0 };
    e.total++; if (a.correct) e.correct++;
    tmap.set(a.topic, e);
  }
  const topics = [...tmap.values()].map(e => ({
    ...e, accuracy: e.total ? e.correct / e.total : 0,
  })).sort((a, b) => a.accuracy - b.accuracy);

  return { total: attempts.length, accuracy, streakDays: streak, topics };
}

// ---- export/import backup file (manual cross-device) ----
export async function exportBackup() {
  const attempts = await allAttempts();
  const settings = {
    theme: await kvGet('theme', 'dark'),
    cf_token: await kvGet('cf_token', ''),
    neuron_cap: await kvGet('neuron_cap', 8000),
  };
  const blob = new Blob([JSON.stringify({ v: 1, attempts, settings }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `sscjht-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
