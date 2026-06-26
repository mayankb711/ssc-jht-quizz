import { loadProfile, saveProfile, getDueReviews, getWeakestSkills, getPredictiveWeaknesses, predictScore } from './profile.js';
import { MemoryModel } from './memory.js';
import { SKILL_DOMAINS } from './skills.js';
import { knowledgeGraph } from './graph.js';
import { allAttempts } from '../store/local.js';
import { logError } from '../core/diagnostics.js';

export class LearningPlanner {
  constructor() {
    this.memory = null;
    this.profile = null;
  }

  async init() {
    this.profile = await loadProfile();
    this.memory = new MemoryModel(this.profile);
    await knowledgeGraph.init();
    return this;
  }

  async createPlan() {
    if (!this.profile) this.profile = await loadProfile();
    if (!this.memory) this.memory = new MemoryModel(this.profile);

    const predictedScore = predictScore(this.profile);
    const dueReviews = getDueReviews(this.profile);
    const weakest = getWeakestSkills(this.profile, 5);
    const atRisk = getPredictiveWeaknesses(this.profile);
    const fatigue = this.profile.fatigue.current;
    const needsWarmup = this.profile.totalQuestions > 0 && fatigue < 0.3;
    const needsCooldown = fatigue > 0.6;

    const plan = {
      predictedScore,
      date: new Date().toISOString().slice(0, 10),
      sessionNumber: (this.profile.totalSessions || 0) + 1,
      fatigueLevel: fatigue,
      segments: [],
      estimatedMinutes: 0,
    };

    let remainingMinutes = 45;

    if (needsWarmup && remainingMinutes >= 3) {
      plan.segments.push({
        type: 'warmup',
        label: 'Warm-up',
        duration: 3,
        count: 3,
        difficulty: 'easy',
        questions: [],
        skill: null,
      });
      remainingMinutes -= 3;
    }

    if (atRisk.length > 0 && remainingMinutes >= 8) {
      const count = Math.min(atRisk.length * 2, 10);
      plan.segments.push({
        type: 'due_review',
        label: 'Predictive Review',
        duration: 8,
        count,
        skill: atRisk[0].skillId,
        focus: 'forgotten',
        targetRecall: atRisk.map(a => a.skillId).slice(0, 3),
      });
      remainingMinutes -= 8;
    }

    if (dueReviews.length > 0 && remainingMinutes >= 5) {
      const count = Math.min(dueReviews.length, 6);
      plan.segments.push({
        type: 'spaced_review',
        label: 'Spaced Repetition Review',
        duration: Math.min(remainingMinutes, 6),
        count,
        skill: dueReviews[0].skillId,
        questions: [],
      });
      remainingMinutes -= 6;
    }

    if (weakest.length > 0 && remainingMinutes >= 8) {
      const target = weakest[0];
      const count = Math.min(6, remainingMinutes / 2);
      plan.segments.push({
        type: 'weak_concept',
        label: `Weak Area: ${target.id}`,
        duration: Math.min(remainingMinutes, 8),
        count,
        skill: target.id,
        mastery: target.mastery,
        questions: [],
      });
      remainingMinutes -= 8;
    }

    if (remainingMinutes >= 8) {
      const domains = Object.values(SKILL_DOMAINS);
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const skill = domain.skills[Math.floor(Math.random() * domain.skills.length)];
      plan.segments.push({
        type: 'new_material',
        label: `New: ${skill.label}`,
        duration: Math.min(remainingMinutes, 8),
        count: Math.min(6, remainingMinutes / 2),
        skill: skill.id,
        newConcept: true,
        questions: [],
      });
      remainingMinutes -= 8;
    }

    if (remainingMinutes >= 5) {
      const count = Math.min(5, Math.floor(remainingMinutes / 1.5));
      plan.segments.push({
        type: 'speed_drill',
        label: 'Speed Drill',
        duration: Math.min(remainingMinutes, 5),
        count,
        timed: true,
        questions: [],
      });
      remainingMinutes -= 5;
    }

    if (needsCooldown && remainingMinutes >= 3) {
      plan.segments.push({
        type: 'confidence_boost',
        label: 'Confidence Boosters',
        duration: 3,
        count: 3,
        difficulty: 'easy',
        questions: [],
      });
      remainingMinutes -= 3;
    }

    plan.estimatedMinutes = 45 - remainingMinutes;
    this.currentPlan = plan;
    this.profile.totalSessions++;
    await saveProfile(this.profile);
    return plan;
  }

  detectContextSwitch(recentAttempts) {
    if (!recentAttempts || recentAttempts.length < 5) return null;
    const last5 = recentAttempts.slice(-5);
    const correct = last5.filter(a => a.correct).length;
    const avgTime = last5.reduce((s, a) => s + (a.responseTime || 15000), 0) / last5.length;
    const fatigue = this.profile?.fatigue?.current || 0;

    if (correct <= 1 && avgTime > 25000 && fatigue > 0.5) {
      return { reason: 'fatigue', action: 'ease_difficulty', easeBy: 2 };
    }
    if (correct <= 1) {
      return { reason: 'struggling', action: 'switch_topic', easeBy: 1 };
    }
    if (avgTime > 30000 && correct >= 3) {
      return { reason: 'slow_but_correct', action: 'speed_drill', easeBy: 0 };
    }
    return null;
  }

  getDifficultyAdjustment(question, recentAttempts) {
    const history = (recentAttempts || []).filter(a => a.question_id === question?.id);
    if (history.length < 2) return 0;
    const avgTime = history.reduce((s, a) => s + (a.responseTime || 15000), 0) / history.length;
    const allCorrect = history.every(a => a.correct);
    if (allCorrect && avgTime < 8000) return -1;
    if (history.filter(a => !a.correct).length >= 2) return 1;
    return 0;
  }

  getEstimatedMinutesForPlan(plan) {
    return plan.segments.reduce((s, seg) => s + seg.duration, 0);
  }
}
