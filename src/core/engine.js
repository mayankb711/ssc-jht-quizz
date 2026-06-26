import { QUESTIONS } from '../data/questions.js';
import { TOPICS } from '../data/topics.js';
import { allAttempts, kvGet } from '../store/local.js';
import { getGeneratedBank } from '../ai/client.js';
import { fetchAttempts } from '../store/cloud.js';
import { getTopicStats, getAllTopicStats } from './progress.js';
import { logError } from './diagnostics.js';
import { LearningPlanner } from '../learning/planner.js';
import { SessionComposer } from '../learning/composer.js';
import { loadProfile, saveProfile } from '../learning/profile.js';

const DAY = 86400000;
let _planner = null;
let _composer = null;

async function ensurePlanner() {
  if (!_planner) {
    _planner = new LearningPlanner();
    await _planner.init();
    _composer = new SessionComposer(_planner);
  }
  return { planner: _planner, composer: _composer };
}

async function getRecentMap() {
  const attempts = await allAttempts();
  const m = new Map();
  for (const a of attempts) {
    const e = m.get(a.question_id);
    if (!e || a.ts > e.last) m.set(a.question_id, { last: a.ts, correct: a.correct, topic: a.topic });
  }
  return m;
}

async function getWrongIds() {
  const attempts = await allAttempts();
  return [...new Set(attempts.filter(a => !a.correct).map(a => a.question_id))];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function computeMastery() {
  await fetchAttempts();
  const topicStats = await getAllTopicStats();
  const mastery = new Map();
  const topicMastery = new Map();
  for (const [topic, acc] of Object.entries(topicStats)) {
    const m = acc.total > 0 ? acc.correct / acc.total : 0.5;
    mastery.set(topic, m);
    topicMastery.set(topic, m);
  }
  return { mastery, topicMastery, skillMastery: new Map(), attempts: [] };
}

export async function pick({ subject, topic, n = 20, pool } = {}) {
  try {
    const { planner, composer } = await ensurePlanner();
    const plan = await planner.createPlan();
    const session = await composer.buildSession(plan);

    if (session.questions.length >= n) {
      let filtered = session.questions;
      if (subject) filtered = filtered.filter(q => {
        const t = TOPICS.find(x => x.id === q.topic);
        return t && t.subject === subject;
      });
      if (topic) filtered = filtered.filter(q => q.topic === topic);
      if (filtered.length >= n) return shuffle(filtered).slice(0, n);
      return shuffle(session.questions).slice(0, n);
    }

    return fallbackPick({ subject, topic, n, pool });
  } catch (e) {
    logError(e, { file: 'engine.js', func: 'pick', action: 'planner pick', source: 'core', context: { subject, topic, n } });
    return fallbackPick({ subject, topic, n, pool });
  }
}

async function fallbackPick({ subject, topic, n = 20, pool } = {}) {
  try {
    const generated = await getGeneratedBank();
    let candidates = pool ?? [...QUESTIONS, ...generated];
    if (subject) candidates = candidates.filter(q => {
      const t = TOPICS.find(x => x.id === q.topic);
      return t && t.subject === subject;
    });
    if (topic) candidates = candidates.filter(q => q.topic === topic);
    if (candidates.length === 0) return [];
    if (candidates.length <= n) return shuffle(candidates);

    const recent = await getRecentMap();
    const wrongIds = new Set(await getWrongIds());
    const topicStats = await getAllTopicStats();
    const now = Date.now();
    const dueQs = []; const mistakeQs = []; const weakQs = []; const randomQs = [];

    for (const q of candidates) {
      const rec = recent.get(q.id);
      const acc = topicStats[q.topic] || { correct: 0, total: 0, lastTs: 0, streak: 0, lastWrong: 0 };
      const mastery = acc.total > 0 ? acc.correct / acc.total : 0.5;
      const daysSinceLast = rec ? (now - rec.last) / DAY : 999;
      const interval = rec?.correct ? 3 * Math.pow(1.6, rec.correct ? 1 : 0) : 0.5;
      const isDue = rec && daysSinceLast >= interval;
      const isNeverSeen = !rec;
      const isWrong = wrongIds.has(q.id);
      const isWeak = mastery < 0.5;

      if (isDue || isNeverSeen) dueQs.push(q);
      else if (isWrong) mistakeQs.push(q);
      else if (isWeak) weakQs.push(q);
      else randomQs.push(q);
    }

    const chosen = [];
    const takeFrom = (arr, pct) => {
      const need = Math.max(1, Math.round(n * pct));
      const taken = shuffle(arr).slice(0, Math.min(need, arr.length));
      chosen.push(...taken);
      return taken.length;
    };

    takeFrom(dueQs, 0.4);
    takeFrom(mistakeQs, 0.3);
    takeFrom(weakQs, 0.2);

    const remaining = n - chosen.length;
    if (remaining > 0) chosen.push(...shuffle(randomQs).slice(0, Math.min(remaining, randomQs.length)));
    if (chosen.length < n) {
      const used = new Set(chosen.map(q => q.id));
      const fill = shuffle(candidates).filter(q => !used.has(q.id));
      chosen.push(...fill.slice(0, n - chosen.length));
    }
    return shuffle(chosen).slice(0, n);
  } catch (e) {
    logError(e, { file: 'engine.js', func: 'fallbackPick', action: 'select questions', source: 'core' });
    const fallback = pool ?? [...QUESTIONS];
    return shuffle(fallback).slice(0, n);
  }
}

export function getPlanner() { return _planner; }
export function getComposer() { return _composer; }

export async function pickMock(structure = DEFAULT_MOCK_STRUCTURE) {
  const out = [];
  for (const seg of structure) {
    const qs = await pick({ subject: seg.subject, topic: seg.topic, n: seg.n });
    out.push(...qs);
  }
  return shuffle(out);
}

export const DEFAULT_MOCK_STRUCTURE = [
  { subject: 'hi', n: 100 },
  { subject: 'en', n: 100 },
];
