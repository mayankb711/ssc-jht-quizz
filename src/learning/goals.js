import { allAttempts } from '../store/local.js';
import { loadProfile, predictScore } from './profile.js';
import { logError } from '../core/diagnostics.js';

export function computeMentalEnergy(profile) {
  const fatigue = profile.fatigue?.current || 0;
  const today = new Date().toDateString();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const attemptsToday = (profile.domains?.hindi?.attempts || 0) + (profile.domains?.english?.attempts || 0);
  const sessionFatigue = Math.min(1, attemptsToday / 50);
  const baseEnergy = 1 - fatigue * 0.5;
  const timeOfDay = getTimeOfDayPenalty();
  const energy = Math.max(0.1, Math.min(1, baseEnergy - sessionFatigue * 0.3 - timeOfDay));
  return {
    energy,
    level: energy > 0.7 ? 'high' : energy > 0.4 ? 'medium' : 'low',
    fatigue,
    sessionFatigue,
    timeOfDayPenalty: timeOfDay,
  };
}

function getTimeOfDayPenalty() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 0;
  if (h >= 12 && h < 14) return 0.05;
  if (h >= 14 && h < 17) return 0.1;
  if (h >= 17 && h < 22) return 0.05;
  return 0.15;
}

export function estimateIdealWorkload(profile) {
  const { energy, level } = computeMentalEnergy(profile);
  const baseCount = level === 'high' ? 50 : level === 'medium' ? 35 : 20;
  const fatiguePenalty = Math.round((profile.fatigue?.current || 0) * 15);
  const streak = profile.streak?.current || 0;
  const streakBonus = Math.min(streak * 0.5, 10);
  const dueCount = Object.values(profile.skills || {}).filter(s => s.nextReview && s.nextReview <= Date.now()).length;
  const dueBonus = Math.min(dueCount * 2, 15);
  const idealCount = Math.max(5, Math.min(100, baseCount - fatiguePenalty + streakBonus + dueBonus));
  const estimatedTimeMinutes = Math.round(idealCount * 0.7);
  return {
    idealCount: Math.round(idealCount),
    estimatedMinutes: estimatedTimeMinutes,
    energy: level,
    breakRecommended: energy < 0.3,
  };
}

export function shouldStopSession(recentAccuracy, profile) {
  const mental = computeMentalEnergy(profile);
  if (mental.energy < 0.25 && recentAccuracy < 0.6) {
    return { stop: true, reason: 'Low energy and declining accuracy. Take a break.' };
  }
  if (recentAccuracy < 0.5 && mental.energy < 0.4) {
    return { stop: true, reason: 'Accuracy dropped below 50% with moderate fatigue. Rest recommended.' };
  }
  if (mental.energy < 0.2) {
    return { stop: true, reason: 'Mental energy very low. Further study unlikely to be productive.' };
  }
  if (profile.fatigue?.current > 0.7) {
    return { stop: true, reason: 'Fatigue level high. Your brain needs rest to consolidate learning.' };
  }
  return { stop: false, reason: null };
}

export async function predictSSCScore(profile) {
  try {
    const baseScore = predictScore(profile);
    if (baseScore == null) return { current: null, likely: null, potential: null, breakdown: {} };
    const attempts = await allAttempts();
    const totalAttempts = attempts.length;
    const recent100 = attempts.slice(-100);
    const recentAccuracy = recent100.length > 0 ? recent100.filter(a => a.correct).length / recent100.length : 0;
    const recentSpeed = recent100.filter(a => a.responseTime).reduce((s, a) => s + a.responseTime, 0) / Math.max(recent100.filter(a => a.responseTime).length, 1);
    const speedScore = recentSpeed > 0 ? Math.min(1, 30000 / recentSpeed) : 0.5;
    const confidenceScore = profile.confidence?.total > 0
      ? profile.confidence.accurate / profile.confidence.total : 0.5;
    const avgMastery = Object.values(profile.domains || {}).reduce((s, d) => s + (d.mastery || 0), 0) / Math.max(Object.keys(profile.domains || {}).length, 1);
    const retentionScore = avgMastery;
    const pyqBonus = totalAttempts > 50 ? Math.min(0.1, totalAttempts * 0.001) : 0;
    const mockTrend = await getMockTrend();
    const mockBonus = mockTrend > 0 ? mockTrend * 10 : 0;
    const current = Math.round(baseScore + pyqBonus * 200);
    const likelyBoost = (speedScore * 0.2 + confidenceScore * 0.15 + retentionScore * 0.25 + recentAccuracy * 0.4) * 30;
    const likely = Math.min(200, Math.round(current + likelyBoost + mockBonus));
    const potentialBoost = 40;
    const potential = Math.min(200, Math.round(likely + potentialBoost));
    return {
      current: Math.min(200, current),
      likely: Math.min(200, likely),
      potential: Math.min(200, potential),
      breakdown: {
        accuracy: recentAccuracy,
        speed: speedScore,
        confidence: confidenceScore,
        retention: retentionScore,
        pyqBonus,
        mockBonus,
      },
    };
  } catch (e) {
    logError(e, { file: 'goals.js', func: 'predictSSCScore' });
    const base = predictScore(profile);
    return { current: base, likely: base, potential: base, breakdown: {} };
  }
}

async function getMockTrend() {
  try {
    const attempts = await allAttempts();
    const mockAttempts = attempts.filter(a => a.mode === 'mock');
    if (mockAttempts.length < 20) return 0;
    const groups = [];
    for (let i = 0; i < mockAttempts.length; i += 20) {
      const chunk = mockAttempts.slice(i, i + 20);
      const acc = chunk.filter(a => a.correct).length / chunk.length;
      groups.push(acc);
    }
    if (groups.length < 2) return 0;
    const first = groups[0];
    const last = groups[groups.length - 1];
    return last - first;
  } catch {
    return 0;
  }
}

export function getTodayGoal(profile) {
  const { idealCount, estimatedMinutes, energy, breakRecommended } = estimateIdealWorkload(profile);
  const doneToday = Object.values(profile.domains || {}).reduce((s, d) => s + d.attempts, 0);
  const remaining = Math.max(0, idealCount - doneToday);
  return {
    target: idealCount,
    remaining,
    estimatedMinutes,
    energy,
    breakRecommended,
    progress: idealCount > 0 ? Math.min(1, doneToday / idealCount) : 0,
  };
}
