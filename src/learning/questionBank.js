import { kvGet, kvSet, allAttempts } from '../store/local.js';
import { logError } from '../core/diagnostics.js';

const QB_KEY = 'question_bank_v1';

export function defaultQuestionMeta() {
  return {
    attempts: 0,
    correct: 0,
    totalTime: 0,
    speedSamples: 0,
    confidenceSum: 0,
    confidenceCount: 0,
    lastTs: 0,
    lastCorrect: false,
    recallCount: 0,
    failCount: 0,
    consecutiveCorrect: 0,
    errorTypes: {},
    lastExplanationViewed: 0,
    personalDifficulty: null,
  };
}

export async function loadQuestionBank() {
  try {
    const qb = await kvGet(QB_KEY, null);
    if (qb) return qb;
    const fresh = {};
    await kvSet(QB_KEY, fresh);
    return fresh;
  } catch (e) {
    logError(e, { file: 'questionBank.js', func: 'loadQuestionBank' });
    return {};
  }
}

export async function saveQuestionBank(qb) {
  await kvSet(QB_KEY, qb);
}

export async function updateQuestionMeta(questionId, { correct, responseTime, confidence, errorType }) {
  const qb = await loadQuestionBank();
  if (!qb[questionId]) qb[questionId] = defaultQuestionMeta();
  const m = qb[questionId];
  m.attempts++;
  if (correct) {
    m.correct++;
    m.consecutiveCorrect++;
    m.recallCount++;
  } else {
    m.consecutiveCorrect = 0;
    m.failCount++;
  }
  m.lastCorrect = correct;
  m.lastTs = Date.now();
  if (responseTime != null) {
    m.totalTime += responseTime;
    m.speedSamples++;
  }
  if (confidence != null) {
    m.confidenceSum += confidence;
    m.confidenceCount++;
  }
  if (errorType) {
    m.errorTypes[errorType] = (m.errorTypes[errorType] || 0) + 1;
  }
  const attemptsNeeded = Math.min(m.attempts, 10);
  const failRate = m.attempts > 0 ? m.failCount / m.attempts : 0;
  const avgTime = m.speedSamples > 0 ? m.totalTime / m.speedSamples : 15000;
  const timeFactor = Math.min(avgTime / 30000, 2);
  const avgConf = m.confidenceCount > 0 ? m.confidenceSum / m.confidenceCount / 5 : 0.5;
  const confPenalty = correct ? 0 : (1 - avgConf) * 0.3;
  m.personalDifficulty = Math.max(1, Math.min(10,
    Math.round((failRate * 5 + timeFactor * 2 + confPenalty * 3) * (10 / attemptsNeeded))
  ));
  await saveQuestionBank(qb);
  return m;
}

export async function getQuestionMeta(questionId) {
  const qb = await loadQuestionBank();
  return qb[questionId] || defaultQuestionMeta();
}

export async function getConsistentlyHardQuestions(threshold = 0.6, minAttempts = 3) {
  const qb = await loadQuestionBank();
  const hard = [];
  for (const [id, m] of Object.entries(qb)) {
    if (m.attempts >= minAttempts && (m.failCount / m.attempts) >= threshold) {
      hard.push({ id, failRate: m.failCount / m.attempts, ...m });
    }
  }
  return hard.sort((a, b) => b.failRate - a.failRate);
}

export async function getQuestionsNeedingReview(limit = 10) {
  const qb = await loadQuestionBank();
  const attempts = await allAttempts();
  const recentIds = new Set();
  attempts.slice(-50).forEach(a => recentIds.add(a.question_id));
  const candidates = [];
  for (const [id, m] of Object.entries(qb)) {
    if (m.attempts < 2) continue;
    const lastAttempt = attempts.filter(a => a.question_id === id).pop();
    const daysSince = lastAttempt ? (Date.now() - lastAttempt.ts) / 86400000 : 999;
    let score = 0;
    if (!m.lastCorrect) score += 10;
    if (m.failCount > m.recallCount) score += 8;
    if (recentIds.has(id)) score += 3;
    if (daysSince > 7 && m.lastCorrect) score += 5;
    if (daysSince > 30) score += 7;
    if (score > 0) candidates.push({ id, score, ...m, daysSince });
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function markExplanationViewed(questionId) {
  const qb = await loadQuestionBank();
  if (!qb[questionId]) qb[questionId] = defaultQuestionMeta();
  qb[questionId].lastExplanationViewed = Date.now();
  await saveQuestionBank(qb);
}
