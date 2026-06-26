import { allAttempts, kvGet, kvSet } from '../store/local.js';
import { recordAttempt, fetchAttempts } from '../store/cloud.js';
import { logError } from './diagnostics.js';
import { emit, DomainEvents } from '../shared/events.js';
import { KV_KEYS, APP } from '../config/app.js';
import { loadProfile, saveProfile, updateProfileAfterAttempt, predictScore, getDueReviews, getWeakestSkills } from '../learning/profile.js';
import { updateQuestionMeta } from '../learning/questionBank.js';
import { knowledgeGraph } from '../learning/graph.js';

let _idc = 0;
function newId() { _idc++; return `${Date.now().toString(36)}-${_idc}-${Math.random().toString(36).slice(2,7)}`; }

function topicAccKey(topic) { return 'topic_acc:' + topic; }

async function getTopicAccumulator(topic) {
  const val = await kvGet(topicAccKey(topic), null);
  return val || { correct: 0, total: 0, lastTs: 0, streak: 0, lastWrong: 0, totalTime: 0, speedSamples: 0 };
}

async function saveTopicAccumulator(topic, acc) {
  await kvSet(topicAccKey(topic), acc);
}

export async function incrementTopicStat(topic, correct, responseTime) {
  const acc = await getTopicAccumulator(topic);
  acc.total++;
  if (correct) acc.correct++;
  acc.lastTs = Date.now();
  if (!correct) { acc.streak = 0; acc.lastWrong = Date.now(); }
  else acc.streak = (acc.streak || 0) + 1;
  if (responseTime > 0) {
    acc.totalTime = (acc.totalTime || 0) + responseTime;
    acc.speedSamples = (acc.speedSamples || 0) + 1;
  }
  await saveTopicAccumulator(topic, acc);
  emit(DomainEvents.TOPIC_ACCUMULATOR_UPDATED, { topic, acc });
  return acc;
}

export async function getTopicStats(topic) {
  return getTopicAccumulator(topic);
}

export async function getAllTopicStats() {
  const allKeys = await kvGet('topic_acc_keys', []);
  const stats = {};
  for (const key of allKeys) {
    stats[key] = await getTopicAccumulator(key);
  }
  return stats;
}

async function saveTopicKeys(keys) {
  await kvSet('topic_acc_keys', keys);
}

async function ensureTopicKey(topic) {
  const keys = await kvGet('topic_acc_keys', []);
  if (!keys.includes(topic)) {
    keys.push(topic);
    await saveTopicKeys(keys);
  }
}

export async function record({ question, chosen, mode, confidence, errorType, responseTime, hesitation, hintUsed, changedAnswer }) {
  const correct = chosen === question.answer;
  const attempt = {
    id: newId(),
    question_id: question.id,
    topic: question.topic,
    subtopic: question.subtopic || null,
    skill: question.skill || null,
    correct,
    chosen,
    ts: Date.now(),
    mode: mode || 'practice',
    confidence: confidence ?? null,
    errorType: errorType ?? null,
    responseTime: responseTime ?? null,
    hesitation: hesitation ?? null,
    hintUsed: hintUsed ?? false,
    changedAnswer: changedAnswer ?? false,
    aiExplanationOpened: false,
    bookmarked: false,
    sessionNumber: null,
    device: 'web',
    difficulty: question.difficulty || 3,
    reviewCount: 0,
  };
  await recordAttempt(attempt);
  await ensureTopicKey(question.topic);
  await incrementTopicStat(question.topic, correct, responseTime);

  const profile = await loadProfile();
  updateProfileAfterAttempt(profile, {
    topic: question.topic,
    skill: question.skill,
    correct,
    confidence,
    responseTime,
    difficulty: question.difficulty,
    ts: Date.now(),
  });
  await saveProfile(profile);

  updateQuestionMeta(question.id, { correct, responseTime, confidence, errorType }).catch(() => {});

  emit(DomainEvents.ATTEMPT_RECORDED, { attempt, correct, topic: question.topic });
  return attempt;
}

export function scoreSession(attempts) {
  let correct = 0, wrong = 0, unattempted = 0;
  for (const a of attempts) {
    if (a.chosen == null) unattempted++;
    else if (a.correct) correct++;
    else wrong++;
  }
  const marks = correct - APP.negativeMarking * wrong;
  return { correct, wrong, unattempted, marks, total: attempts.length };
}

export async function summary() {
  try {
    await fetchAttempts();
    const topicKeys = await kvGet('topic_acc_keys', []);
    if (!topicKeys.length) {
      const attempts = await allAttempts();
      if (!attempts.length) return { total: 0, accuracy: 0, streakDays: 0, topics: [], predictedScore: null };
      return computeSummaryFromAttempts(attempts);
    }
    const days = new Set();
    let totalCorrect = 0, totalCount = 0;
    const topics = [];
    for (const key of topicKeys) {
      const acc = await getTopicAccumulator(key);
      if (acc.total === 0) continue;
      totalCorrect += acc.correct;
      totalCount += acc.total;
      if (acc.lastTs) days.add(new Date(acc.lastTs).toDateString());
      topics.push({
        topic: key,
        correct: acc.correct,
        total: acc.total,
        accuracy: acc.correct / acc.total,
        lastTs: acc.lastTs,
        streak: acc.streak || 0,
      });
    }
    topics.sort((a, b) => a.accuracy - b.accuracy);

    let streak = 0;
    let d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }

    const profile = await loadProfile();
    const predictedScore = predictScore(profile);

    return { total: totalCount, accuracy: totalCount ? totalCorrect / totalCount : 0, streakDays: streak, topics, predictedScore };
  } catch (e) {
    logError(e, { file: 'progress.js', func: 'summary', source: 'core', action: 'compute summary statistics' });
    const attempts = await allAttempts().catch(() => []);
    if (!attempts.length) return { total: 0, accuracy: 0, streakDays: 0, topics: [] };
    return computeSummaryFromAttempts(attempts);
  }
}

async function computeSummaryFromAttempts(attempts) {
  const correct = attempts.filter(a => a.correct).length;
  const accuracy = correct / attempts.length;
  const days = new Set(attempts.map(a => new Date(a.ts).toDateString()));
  let streak = 0;
  let d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
  const tmap = new Map();
  for (const a of attempts) {
    const e = tmap.get(a.topic) || { topic: a.topic, correct: 0, total: 0 };
    e.total++; if (a.correct) e.correct++;
    tmap.set(a.topic, e);
  }
  const topics = [...tmap.values()].map(e => ({
    ...e, accuracy: e.total ? e.correct / e.total : 0,
  })).sort((a, b) => a.accuracy - b.accuracy);
  return { total: attempts.length, accuracy, streakDays: streak, topics, predictedScore: null };
}

export async function exportBackup() {
  const attempts = await allAttempts();
  const settings = {
    [KV_KEYS.theme]: await kvGet(KV_KEYS.theme, 'dark'),
    [KV_KEYS.cfToken]: await kvGet(KV_KEYS.cfToken, ''),
    [KV_KEYS.neuronCap]: await kvGet(KV_KEYS.neuronCap, 8000),
  };
  const blob = new Blob([JSON.stringify({ v: 1, attempts, settings }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `sscjht-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
