/* ============================================================
   engine.js — adaptive question selection (LOCAL, 0 neurons).
   Algorithm: weighted lottery where each (topic) and (difficulty)
   weight is derived from the learner's mastery curve.
   - Weak topics get higher weight (drill weak areas).
   - Correctly-answered questions are spaced (SRS: half-life grows
     on each correct, resets on each wrong), so they resurface less.
   - Difficulty floats toward the band where the learner is ~65%
     correct (zone of proximal development).
   Mastery = smoothed correct-rate per (topic,skill) over recency.
   ============================================================ */

import { QUESTIONS } from '../data/questions.js';
import { TOPICS } from '../data/topics.js';
import { allAttempts } from '../store/local.js';
import { getGeneratedBank } from '../ai/client.js';

const DAY = 86400000;

// Build per-(topic.skill) mastery from attempts. Returns Map.
export async function computeMastery() {
  const attempts = await allAttempts();
  const now = Date.now();
  // decay weight: newer attempts count more
  const buckets = new Map(); // key -> {w, c}
  const topicBuckets = new Map();
  for (const a of attempts) {
    const key = a.skill ? `${a.topic}.${a.skill}` : a.topic;
    const ageDays = Math.max(0, (now - (a.ts || now)) / DAY);
    const w = Math.exp(-ageDays / 14);          // 2-week half-life-ish
    const b = buckets.get(key) || { w: 0, c: 0 };
    b.w += w * (a.correct ? 1 : 0);
    b.c += w;
    buckets.set(key, b);

    const tb = topicBuckets.get(a.topic) || { w: 0, c: 0 };
    tb.w += w * (a.correct ? 1 : 0);
    tb.c += w;
    topicBuckets.set(a.topic, tb);
  }
  const mastery = new Map();
  for (const [key, b] of buckets) mastery.set(key, b.c > 0 ? b.w / b.c : 0.5);
  const topicMastery = new Map();
  for (const [key, b] of topicBuckets.entries()) topicMastery.set(key, b.c > 0 ? b.w / b.c : 0.5);
  const skillMastery = new Map([...mastery.entries()].filter(([key]) => key.includes('.')));
  return { mastery, topicMastery, skillMastery, attempts };
}

// Which difficulty band targets ~65% correctness for this learner?
function targetDifficulty(mastery, topicKey) {
  const m = mastery.get(topicKey) ?? 0.5;
  // map mastery 0..1 -> difficulty 1..5; weak => easier start, strong => harder
  return Math.max(1, Math.min(5, Math.round(1 + m * 4)));
}

// Last time each question id was shown + correctness, for spacing.
function recentMap(attempts) {
  const m = new Map(); // qid -> {last, correct}
  for (const a of attempts) {
    const e = m.get(a.question_id);
    if (!e || a.ts > e.last) m.set(a.question_id, { last: a.ts, correct: a.correct });
  }
  return m;
}

// Spacing score: 1 = show now, 0 = recently shown.
function spacingScore(qid, recent, now) {
  const e = recent.get(qid);
  if (!e) return 1;                       // never seen -> fresh
  const days = (now - e.last) / DAY;
  const interval = e.correct ? 3 * Math.pow(1.6, streakAfter(qid, recent)) : 0.5;
  return Math.min(1, days / interval);
}
// crude streak: count of trailing correct for this q
function streakAfter(qid, recent) {
  return recent.get(qid)?.correct ? 1 : 0; // simplified; could extend
}

/**
 * Pick N questions for a session.
 * @param {object} opts
 *   subject : 'hi'|'en'|undefined  (filter)
 *   topic   : topicId|undefined     (filter)
 *   n       : number to pick
 *   pool    : array of questions (defaults to QUESTIONS, filtered)
 */
export async function pick({ subject, topic, n = 20, pool } = {}) {
  const { mastery, attempts } = await computeMastery();
  const now = Date.now();
  const recent = recentMap(attempts);

  const generated = await getGeneratedBank();
  let candidates = pool ?? [...QUESTIONS, ...generated];
  if (subject) candidates = candidates.filter(q => {
    const t = TOPICS.find(x => x.id === q.topic);
    return t && t.subject === subject;
  });
  if (topic) candidates = candidates.filter(q => q.topic === topic);

  if (candidates.length === 0) return [];
  if (candidates.length <= n) return shuffle(candidates);

  // weight each candidate
  const weighted = candidates.map(q => {
    const tKey = q.skill ? `${q.topic}.${q.skill}` : q.topic;
    const m = mastery.get(tKey) ?? 0.5;
    const weakness = 1 - m;                       // drill weak topics
    const diffFit = 1 - Math.abs((q.difficulty - targetDifficulty(mastery, tKey)) / 5);
    const space = spacingScore(q.id, recent, now);
    const w = (0.5 * weakness + 0.3 * diffFit + 0.2 * space) + 0.05;
    return { q, w };
  });

  // weighted lottery without replacement
  const chosen = [];
  const avail = [...weighted];
  while (chosen.length < n && avail.length) {
    const total = avail.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    let i = 0;
    for (; i < avail.length; i++) { r -= avail[i].w; if (r <= 0) break; }
    chosen.push(avail[i].q);
    avail.splice(i, 1);
  }
  return chosen;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mock-test selection: mimic the real paper's structure. */
export async function pickMock(structure = DEFAULT_MOCK_STRUCTURE) {
  // structure: [{subject, topic?, n}]
  const out = [];
  for (const seg of structure) {
    const qs = await pick({ subject: seg.subject, topic: seg.topic, n: seg.n });
    out.push(...qs);
  }
  return shuffle(out);
}

// Real paper: 100 General Hindi + 100 General English. As the PYQ
// analysis refines topic distribution, this is updated to mirror it
// exactly (e.g. X comprehension, Y grammar, Z vocab per subject).
export const DEFAULT_MOCK_STRUCTURE = [
  { subject: 'hi', n: 100 },
  { subject: 'en', n: 100 },
];
