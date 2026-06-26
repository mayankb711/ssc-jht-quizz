import { allAttempts } from '../store/local.js';
import { loadProfile, predictScore, getDueReviews, getWeakestSkills } from './profile.js';
import { MemoryModel } from './memory.js';
import { logError } from '../core/diagnostics.js';
import { TOPICS } from '../data/topics.js';
import { SKILL_DOMAINS } from './skills.js';

export class AnalyticsEngine {
  constructor() {
    this.cache = new Map();
    this.cacheTtl = 60000;
    this.memory = null;
    this.profile = null;
  }

  async init() {
    this.profile = await loadProfile();
    this.memory = new MemoryModel(this.profile);
    return this;
  }

  async getDailyProgress() {
    const cached = this.getCached('dailyProgress');
    if (cached) return cached;

    const attempts = await allAttempts();
    const today = new Date().toDateString();
    const todayAttempts = attempts.filter(a => new Date(a.ts).toDateString() === today);
    const correct = todayAttempts.filter(a => a.correct).length;
    const result = {
      total: todayAttempts.length,
      correct,
      accuracy: todayAttempts.length > 0 ? correct / todayAttempts.length : 0,
      streak: this.profile?.streak?.current || 0,
      predictedScore: predictScore(this.profile),
      timeSpent: todayAttempts.reduce((s, a) => s + (a.responseTime || 0), 0),
    };
    this.setCached('dailyProgress', result);
    return result;
  }

  async getTopicMastery() {
    const cached = this.getCached('topicMastery');
    if (cached) return cached;

    const profile = this.profile || await loadProfile();
    const topics = [];
    for (const topic of TOPICS) {
      const domain = profile.domains[topic.subject === 'hi' ? 'hindi' : 'english'];
      if (!domain || domain.attempts === 0) continue;
      topics.push({
        id: topic.id,
        label: topic.label,
        mastery: domain.mastery,
        attempts: domain.attempts,
        correct: domain.correct,
        confidence: domain.confidence,
        speed: domain.speed,
      });
    }
    this.setCached('topicMastery', topics);
    return topics;
  }

  async getRetentionCurves(skillIds, days = 30) {
    const curves = {};
    const profile = this.profile || await loadProfile();
    for (const skillId of skillIds) {
      const skill = profile.skills[skillId];
      if (skill) {
        curves[skillId] = this.memory.getForgettingCurve(skill, days);
      }
    }
    return curves;
  }

  async getWeaknessTrends() {
    const cached = this.getCached('weaknessTrends');
    if (cached) return cached;

    const attempts = await allAttempts();
    const byWeek = new Map();
    for (const a of attempts) {
      if (!a.ts) continue;
      const week = new Date(a.ts).toISOString().slice(0, 7);
      if (!byWeek.has(week)) byWeek.set(week, { total: 0, correct: 0, byTopic: {} });
      const w = byWeek.get(week);
      w.total++;
      if (a.correct) w.correct++;
      if (a.topic) {
        if (!w.byTopic[a.topic]) w.byTopic[a.topic] = { total: 0, correct: 0 };
        w.byTopic[a.topic].total++;
        if (a.correct) w.byTopic[a.topic].correct++;
      }
    }
    const trends = [];
    for (const [week, data] of byWeek) {
      trends.push({
        week,
        accuracy: data.total > 0 ? data.correct / data.total : 0,
        total: data.total,
        weakestTopics: Object.entries(data.byTopic)
          .map(([t, d]) => ({ topic: t, accuracy: d.total > 0 ? d.correct / d.total : 0 }))
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 3),
      });
    }
    this.setCached('weaknessTrends', trends.sort((a, b) => a.week.localeCompare(b.week)));
    return trends;
  }

  async getConfidenceCalibration() {
    const profile = this.profile || await loadProfile();
    return profile.confidence || { overconfident: 0, underconfident: 0, accurate: 0, total: 0 };
  }

  async getSpeedTrends() {
    const cached = this.getCached('speedTrends');
    if (cached) return cached;

    const attempts = await allAttempts();
    const by50 = [];
    for (let i = 0; i < attempts.length; i += 50) {
      const batch = attempts.slice(i, i + 50).filter(a => a.responseTime);
      if (batch.length === 0) continue;
      const avg = batch.reduce((s, a) => s + a.responseTime, 0) / batch.length;
      const correct = batch.filter(a => a.correct).length;
      by50.push({
        batch: i / 50 + 1,
        avgResponse: avg,
        accuracy: correct / batch.length,
        count: batch.length,
      });
    }
    this.setCached('speedTrends', by50);
    return by50;
  }

  async getPredictedScore() {
    return predictScore(this.profile || await loadProfile());
  }

  async getStudyConsistency() {
    const attempts = await allAttempts();
    const byDate = new Map();
    for (const a of attempts) {
      const d = new Date(a.ts).toDateString();
      byDate.set(d, (byDate.get(d) || 0) + 1);
    }
    const days = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return {
      totalDays: days.length,
      averagePerDay: days.length > 0
        ? Math.round(days.reduce((s, [,c]) => s + c, 0) / days.length)
        : 0,
      longestStreak: this.profile?.streak?.longest || 0,
      currentStreak: this.profile?.streak?.current || 0,
    };
  }

  async getRecommendedFocus() {
    const profile = this.profile || await loadProfile();
    const due = getDueReviews(profile);
    const weak = getWeakestSkills(profile, 3);

    if (due.length > 0) {
      return { type: 'review', skill: due[0].skillId, reason: `${due.length} reviews due` };
    }
    if (weak.length > 0) {
      return { type: 'practice', skill: weak[0].id, reason: `Weakest area: ${weak[0].id}` };
    }
    return { type: 'new', skill: null, reason: 'Explore new material' };
  }

  getCached(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.ts < this.cacheTtl) return entry.data;
    return null;
  }

  setCached(key, data) {
    this.cache.set(key, { data, ts: Date.now() });
  }

  invalidateCache() {
    this.cache.clear();
  }
}
