import { logError } from '../core/diagnostics.js';

export class MemoryModel {
  constructor(profile) {
    this.profile = profile;
  }

  computeStrength(skillState) {
    if (!skillState || skillState.attempts === 0) return 0.5;
    const recency = Math.min(1, skillState.lastReview > 0
      ? (Date.now() - skillState.lastReview) / (30 * 86400000) : 0.5);
    return Math.max(0, Math.min(1,
      skillState.mastery * 0.35 +
      skillState.consistency * 0.25 +
      skillState.speed * 0.15 +
      (1 - recency) * 0.15 +
      skillState.confidence * 0.1
    ));
  }

  computeRecallProbability(skillState) {
    if (!skillState || skillState.attempts === 0) return 0.5;
    const daysSince = skillState.lastReview > 0
      ? (Date.now() - skillState.lastReview) / 86400000 : 0;
    const decay = skillState.decayRate || 0.1;
    return Math.max(0, Math.min(1,
      skillState.memoryStrength * Math.exp(-decay * daysSince)
    ));
  }

  computeDecayRate(skillState) {
    if (!skillState || skillState.attempts < 3) return 0.1;
    const base = 0.12 - skillState.mastery * 0.08;
    const speedBoost = Math.min(skillState.speed || 1, 2) * 0.02;
    const consistencyBoost = (skillState.consistency || 0.5) * 0.02;
    return Math.max(0.02, Math.min(0.2, base - speedBoost - consistencyBoost));
  }

  computeNextReview(skillState) {
    if (!skillState || skillState.attempts === 0) return Date.now();
    const intervals = [1, 3, 7, 14, 30, 60, 120];
    const idx = Math.min(skillState.reviewCount || 0, intervals.length - 1);
    const baseInterval = intervals[idx] * 86400000;
    const masteryBonus = skillState.mastery > 0.8 ? 1.5
      : skillState.mastery > 0.6 ? 1.2 : 0.8;
    return skillState.lastReview + baseInterval * masteryBonus;
  }

  predictTomorrowRecall(skillState) {
    const rp = this.computeRecallProbability(skillState);
    const decay = skillState.decayRate || 0.1;
    return rp * Math.exp(-decay);
  }

  getForgettingCurve(skillState, days = 30) {
    const rp = this.computeRecallProbability(skillState);
    const decay = skillState.decayRate || 0.1;
    const curve = [];
    for (let d = 0; d <= days; d++) {
      curve.push({
        day: d,
        probability: rp * Math.exp(-decay * d),
      });
    }
    return curve;
  }

  estimateDifficultyAdjustment(questionId, topic, profile, history) {
    const d = profile.difficulty.byQuestion[topic];
    if (!d) return 0;
    const recent = (history || []).filter(a =>
      a.question_id === questionId
    ).slice(-3);
    if (recent.length < 2) return 0;
    const avgSpeed = recent.reduce((s, a) => s + (a.responseTime || 15000), 0) / recent.length;
    const allCorrect = recent.every(a => a.correct);
    if (allCorrect && avgSpeed < 10000) return -1;
    if (recent.filter(a => !a.correct).length >= 2) return 1;
    return 0;
  }
}
