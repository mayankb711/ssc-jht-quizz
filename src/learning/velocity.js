import { allAttempts } from '../store/local.js';
import { loadProfile } from './profile.js';
import { logError } from '../core/diagnostics.js';
import { TOPICS } from '../data/topics.js';

export async function computeTopicVelocity() {
  const attempts = await allAttempts();
  if (attempts.length < 3) return {};
  const topicData = {};
  for (const a of attempts) {
    if (!a.topic) continue;
    if (!topicData[a.topic]) {
      topicData[a.topic] = { attempts: [], correct: 0, total: 0, timestamps: [] };
    }
    topicData[a.topic].attempts.push(a);
    topicData[a.topic].total++;
    if (a.correct) topicData[a.topic].correct++;
    topicData[a.topic].timestamps.push(a.ts);
  }
  const result = {};
  for (const [topic, data] of Object.entries(topicData)) {
    if (data.total < 2) continue;
    const sorted = data.timestamps.sort((a, b) => a - b);
    const firstTs = sorted[0];
    const lastTs = sorted[sorted.length - 1];
    const daysActive = Math.max(1, (lastTs - firstTs) / 86400000);
    const mastery = data.correct / data.total;
    const questionsUntilMastery = findMasteryMilestone(data.attempts, 0.7);
    const consecutiveForMastery = findConsecutiveMastery(data.attempts);
    const recent5 = data.attempts.slice(-5);
    const recentAccuracy = recent5.length > 0 ? recent5.filter(a => a.correct).length / recent5.length : 0;
    const recentSpeed = recent5.filter(a => a.responseTime).reduce((s, a) => s + a.responseTime, 0) / Math.max(recent5.filter(a => a.responseTime).length, 1);
    const masteryTrend = recentAccuracy - mastery;
    const reviewCount = countReviewCycles(data.attempts);
    const daysUntilForgetting = estimateDaysUntilForgetting(data.attempts, mastery);
    result[topic] = {
      mastery,
      questionsAttempted: data.total,
      questionsUntilMastery,
      consecutiveForMastery,
      recentAccuracy,
      recentSpeed,
      masteryTrend,
      reviewCount,
      daysUntilForgetting,
      velocity: mastery / Math.max(daysActive, 0.5),
    };
  }
  return result;
}

function findMasteryMilestone(attempts, threshold) {
  let correct = 0;
  for (let i = 0; i < attempts.length; i++) {
    if (attempts[i].correct) correct++;
    const rate = (i + 1) > 0 ? correct / (i + 1) : 0;
    if (rate >= threshold) return i + 1;
  }
  return attempts.length;
}

function findConsecutiveMastery(attempts) {
  let best = 0;
  let current = 0;
  for (const a of attempts) {
    if (a.correct) { current++; best = Math.max(best, current); }
    else current = 0;
  }
  return best;
}

function countReviewCycles(attempts) {
  if (attempts.length < 2) return 0;
  const sorted = [...attempts].sort((a, b) => a.ts - b.ts);
  let cycles = 0;
  let inCycle = false;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = (sorted[i + 1].ts - sorted[i].ts) / 86400000;
    if (gap > 1 && inCycle) { cycles++; inCycle = false; }
    else if (gap <= 1) inCycle = true;
  }
  if (inCycle) cycles++;
  return cycles;
}

function estimateDaysUntilForgetting(attempts, mastery) {
  if (attempts.length < 3) return 30;
  const sorted = [...attempts].sort((a, b) => a.ts - b.ts);
  let totalRetention = 0;
  let retentionCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.correct && !curr.correct) {
      const gap = (curr.ts - prev.ts) / 86400000;
      if (gap > 0.1 && gap < 365) {
        totalRetention += gap;
        retentionCount++;
      }
    }
  }
  if (retentionCount === 0) {
    const avgGap = sorted.length > 1
      ? (sorted[sorted.length - 1].ts - sorted[0].ts) / (sorted.length - 1) / 86400000
      : 7;
    return Math.round(avgGap * (mastery + 0.5));
  }
  return Math.round(totalRetention / retentionCount);
}

export async function getLearningDNA() {
  try {
    const profile = await loadProfile();
    const velocity = await computeTopicVelocity();
    const attempts = await allAttempts();
    const topicIds = Object.keys(velocity);
    const dna = {
      archetype: determineArchetype(velocity),
      strengths: [],
      weaknesses: [],
      patterns: {},
      metrics: {},
      recommendations: [],
    };
    const sortedByMastery = topicIds
      .map(t => ({ topic: t, ...velocity[t] }))
      .sort((a, b) => b.mastery - a.mastery);
    dna.strengths = sortedByMastery.filter(t => t.mastery >= 0.7).map(t => t.topic);
    dna.weaknesses = sortedByMastery.filter(t => t.mastery < 0.5).map(t => t.topic);
    const topicLabels = {};
    TOPICS.forEach(t => { topicLabels[t.id] = t.label; });
    dna.metrics = {
      totalAttempts: attempts.length,
      topicsAttempted: topicIds.length,
      avgMastery: topicIds.length > 0
        ? topicIds.reduce((s, t) => s + velocity[t].mastery, 0) / topicIds.length : 0,
      avgVelocity: topicIds.length > 0
        ? topicIds.reduce((s, t) => s + velocity[t].velocity, 0) / topicIds.length : 0,
      fastestTopic: topicIds.length > 0
        ? topicIds.reduce((a, b) => velocity[a].velocity > velocity[b].velocity ? a : b) : null,
      slowestTopic: topicIds.length > 0
        ? topicIds.reduce((a, b) => velocity[a].velocity < velocity[b].velocity ? a : b) : null,
      bestRetention: topicIds.length > 0
        ? topicIds.reduce((a, b) => (velocity[a].daysUntilForgetting || 30) > (velocity[b].daysUntilForgetting || 30) ? a : b) : null,
    };
    const fastTopics = topicIds.filter(t => (velocity[t].velocity || 0) > 0.3);
    const slowTopics = topicIds.filter(t => (velocity[t].velocity || 0) < 0.1);
    if (fastTopics.length > slowTopics.length + 1) dna.archetype = 'Fast Learner';
    if (slowTopics.length > fastTopics.length) dna.archetype = 'Steady Learner';
    if (profile.totalQuestions > 100) dna.archetype = 'Experienced Learner';
    const worstRetention = topicIds.filter(t => (velocity[t].daysUntilForgetting || 30) < 3);
    if (worstRetention.length > 1) {
      dna.recommendations.push(`Needs frequent review: ${worstRetention.map(t => topicLabels[t] || t).join(', ')}`);
    }
    for (const t of dna.weaknesses.slice(0, 3)) {
      const label = topicLabels[t] || t;
      const v = velocity[t];
      if (v.recentAccuracy > v.mastery + 0.1) {
        dna.recommendations.push(`${label}: improving (recent accuracy ${Math.round(v.recentAccuracy * 100)}%)`);
      } else if (v.recentAccuracy < v.mastery - 0.1) {
        dna.recommendations.push(`${label}: declining (recent accuracy ${Math.round(v.recentAccuracy * 100)}%) — review urgently`);
      } else {
        dna.recommendations.push(`${label}: needs targeted practice (mastery ${Math.round(v.mastery * 100)}%)`);
      }
    }
    return dna;
  } catch (e) {
    logError(e, { file: 'velocity.js', func: 'getLearningDNA' });
    return { archetype: 'New Learner', strengths: [], weaknesses: [], recommendations: ['Keep practicing to build your learning profile'] };
  }
}

function determineArchetype(velocity) {
  const topics = Object.values(velocity);
  if (topics.length === 0) return 'New Learner';
  const avgMastery = topics.reduce((s, t) => s + t.mastery, 0) / topics.length;
  const avgVelocity = topics.reduce((s, t) => s + t.velocity, 0) / topics.length;
  const consistentTopics = topics.filter(t => Math.abs(t.masteryTrend) < 0.15).length;
  const consistency = topics.length > 0 ? consistentTopics / topics.length : 1;
  if (avgMastery > 0.7 && avgVelocity > 0.3) return 'Fast Learner';
  if (avgMastery > 0.7 && consistency > 0.6) return 'Consistent Master';
  if (avgVelocity > 0.3) return 'Rapid Improver';
  if (avgMastery > 0.5) return 'Steady Learner';
  return 'Building Foundation';
}
