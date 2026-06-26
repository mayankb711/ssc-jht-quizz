import { kvGet, kvSet } from '../store/local.js';
import { logError } from '../core/diagnostics.js';
import { VERSION } from '../config/app.js';
import { SKILL_DOMAINS } from './skills.js';

const PROFILE_KEY = 'learner_profile_v1';

const DEFAULT_PROFILE = {
  version: 1,
  created: Date.now(),
  lastUpdated: Date.now(),
  totalSessions: 0,
  totalQuestions: 0,
  predictedPaper1Score: null,
  predictedPaper2Score: null,
  domains: {},
  memory: {
    nextReview: {},
    decayRates: {},
    recallProbabilities: {},
    memoryStrengths: {},
    lastReviewTs: {},
  },
  fatigue: {
    current: 0,
    trend: [],
    lastDropTs: null,
  },
  difficulty: {
    byQuestion: {},
    byTopic: {},
  },
  skills: {},
  confidence: {
    calibration: { overconfident: 0, underconfident: 0, accurate: 0, total: 0 },
    byTopic: {},
  },
  streak: {
    current: 0,
    longest: 0,
    lastDate: null,
  },
};

function domainId(topic) {
  return topic?.startsWith?.('en') ? 'english' : 'hindi';
}

function defaultDomain(name) {
  return {
    name,
    mastery: 0.5,
    confidence: 0.5,
    forgetting: 0.5,
    speed: 1,
    fatigue: 0,
    attempts: 0,
    correct: 0,
    lastTs: 0,
    skills: {},
    subdomains: {},
  };
}

function defaultSkill() {
  return {
    mastery: 0.5,
    confidence: 0.5,
    speed: 1,
    consistency: 0.5,
    attempts: 0,
    correct: 0,
    memoryStrength: 0.5,
    recallProbability: 0.5,
    decayRate: 0.1,
    lastReview: 0,
    nextReview: 0,
    reviewCount: 0,
  };
}

export async function loadProfile() {
  try {
    const profile = await kvGet(PROFILE_KEY, null);
    if (profile && profile.version === 1) return mergeDefaults(profile);
    const fresh = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    await saveProfile(fresh);
    return fresh;
  } catch (e) {
    logError(e, { file: 'profile.js', func: 'loadProfile', action: 'load learner profile', source: 'learning' });
    return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  }
}

export async function saveProfile(profile) {
  profile.lastUpdated = Date.now();
  await kvSet(PROFILE_KEY, profile);
}

function mergeDefaults(profile) {
  if (!profile.domains) profile.domains = {};
  if (!profile.memory) profile.memory = DEFAULT_PROFILE.memory;
  if (!profile.fatigue) profile.fatigue = DEFAULT_PROFILE.fatigue;
  if (!profile.difficulty) profile.difficulty = DEFAULT_PROFILE.difficulty;
  if (!profile.skills) profile.skills = {};
  if (!profile.confidence) profile.confidence = DEFAULT_PROFILE.confidence;
  if (!profile.streak) profile.streak = DEFAULT_PROFILE.streak;
  return profile;
}

export function ensureDomain(profile, topic) {
  const id = domainId(topic);
  if (!profile.domains[id]) {
    profile.domains[id] = defaultDomain(id);
  }
  return profile.domains[id];
}

export function ensureSkill(profile, skillId) {
  if (!profile.skills[skillId]) {
    profile.skills[skillId] = defaultSkill();
  }
  return profile.skills[skillId];
}

export function ensureTopicSkill(profile, topic, skill) {
  const domain = ensureDomain(profile, topic);
  if (!domain.skills[skill]) {
    domain.skills[skill] = defaultSkill();
  }
  return domain.skills[skill];
}

export function updateProfileAfterAttempt(profile, { topic, skill, correct, confidence, responseTime, difficulty, ts }) {
  const domain = ensureDomain(profile, topic);
  domain.attempts++;
  if (correct) domain.correct++;
  domain.mastery = domain.attempts > 0 ? domain.correct / domain.attempts : 0.5;
  domain.lastTs = ts || Date.now();

  if (skill) {
    const s = ensureTopicSkill(profile, topic, skill);
    s.attempts++;
    if (correct) s.correct++;
    s.mastery = s.attempts > 0 ? s.correct / s.attempts : 0.5;
    s.lastReview = ts || Date.now();

    if (confidence != null) {
      s.confidence = Math.max(0, Math.min(1, s.confidence + (correct ? (confidence / 5 - s.confidence) * 0.15 : (s.confidence - confidence / 5) * 0.1)));
    }

    if (responseTime != null) {
      const expected = difficulty ? 10 + difficulty * 5 : 15;
      const ratio = expected / Math.max(responseTime / 1000, 1);
      s.speed = Math.max(0.1, Math.min(3, s.speed + (Math.min(ratio, 2) - s.speed) * 0.1));
    }

    s.consistency = s.attempts > 5
      ? Math.max(0, Math.min(1, s.consistency + (correct ? 0.05 : -0.1)))
      : s.consistency;

    s.memoryStrength = computeMemoryStrength(s);
    s.recallProbability = computeRecallProbability(s);
    s.decayRate = computeDecayRate(s);
    s.nextReview = computeNextReview(s);
  }

  if (difficulty) {
    profile.difficulty.byQuestion[topic] = difficulty;
  }

  updateFatigue(profile, correct, responseTime);
  updateConfidenceCalibration(profile, correct, confidence);
  updateStreak(profile, correct, ts);
  profile.totalQuestions++;
  return profile;
}

function updateFatigue(profile, correct, responseTime) {
  const f = profile.fatigue;
  if (!correct) f.current = Math.min(1, f.current + 0.08);
  else if (responseTime && responseTime > 30000) f.current = Math.min(1, f.current + 0.05);
  else f.current = Math.max(0, f.current - 0.03);
  f.trend.push({ ts: Date.now(), value: f.current });
  if (f.trend.length > 50) f.trend.shift();
}

function updateConfidenceCalibration(profile, correct, confidence) {
  const c = profile.confidence;
  c.total++;
  if (confidence == null) return;
  if (correct && confidence >= 4) c.accurate++;
  else if (!correct && confidence >= 4) c.overconfident++;
  else if (correct && confidence <= 2) c.underconfident++;
}

function updateStreak(profile, correct, ts) {
  const today = new Date(ts || Date.now()).toDateString();
  if (profile.streak.lastDate === today) return;
  if (correct && profile.streak.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (profile.streak.lastDate === yesterday || !profile.streak.lastDate) {
      profile.streak.current++;
    } else {
      profile.streak.current = 1;
    }
    profile.streak.lastDate = today;
    if (profile.streak.current > profile.streak.longest) {
      profile.streak.longest = profile.streak.current;
    }
  }
}

export function computeMemoryStrength(skill) {
  if (!skill || skill.attempts === 0) return 0.5;
  const recency = Math.min(1, skill.lastReview > 0 ? (Date.now() - skill.lastReview) / (30 * 86400000) : 0.5);
  return Math.max(0, Math.min(1,
    skill.mastery * 0.35 +
    skill.consistency * 0.25 +
    skill.speed * 0.15 +
    (1 - recency) * 0.15 +
    skill.confidence * 0.1
  ));
}

export function computeRecallProbability(skill) {
  if (!skill || skill.attempts === 0) return 0.5;
  const daysSince = skill.lastReview > 0 ? (Date.now() - skill.lastReview) / 86400000 : 0;
  const decay = skill.decayRate || 0.1;
  return Math.max(0, Math.min(1, skill.memoryStrength * Math.exp(-decay * daysSince)));
}

export function computeDecayRate(skill) {
  if (!skill || skill.attempts < 3) return 0.1;
  const base = 0.12 - skill.mastery * 0.08;
  const speedBoost = Math.min(skill.speed || 1, 2) * 0.02;
  const consistencyBoost = (skill.consistency || 0.5) * 0.02;
  return Math.max(0.02, Math.min(0.2, base - speedBoost - consistencyBoost));
}

export function computeNextReview(skill) {
  if (!skill || skill.attempts === 0) return Date.now();
  const intervals = [1, 3, 7, 14, 30, 60, 120];
  const idx = Math.min(skill.reviewCount || 0, intervals.length - 1);
  const baseInterval = intervals[idx] * 86400000;
  const masteryBonus = skill.mastery > 0.8 ? 1.5 : skill.mastery > 0.6 ? 1.2 : 0.8;
  return skill.lastReview + baseInterval * masteryBonus;
}

export function predictScore(profile) {
  let weightedMastery = 0;
  let totalWeight = 0;
  for (const [id, domain] of Object.entries(profile.domains)) {
    if (domain.attempts < 3) continue;
    const weight = Math.min(domain.attempts, 50);
    weightedMastery += domain.mastery * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return null;
  const overall = weightedMastery / totalWeight;
  return Math.round(overall * 200);
}

export function getDueReviews(profile) {
  const now = Date.now();
  const due = [];
  for (const [skillId, skill] of Object.entries(profile.skills)) {
    if (skill.nextReview && skill.nextReview <= now && skill.attempts > 0) {
      due.push({ skillId, ...skill });
    }
  }
  return due.sort((a, b) => a.recallProbability - b.recallProbability);
}

export function getWeakestSkills(profile, count = 5) {
  const skills = [];
  for (const [id, skill] of Object.entries(profile.skills)) {
    if (skill.attempts >= 2) {
      skills.push({ id, ...skill });
    }
  }
  return skills.sort((a, b) => a.mastery - b.mastery).slice(0, count);
}

export function getPredictiveWeaknesses(profile) {
  const now = Date.now();
  const atRisk = [];
  for (const [skillId, skill] of Object.entries(profile.skills)) {
    if (skill.attempts < 2) continue;
    const rp = skill.recallProbability || 0.5;
    const daysSince = skill.lastReview > 0 ? (now - skill.lastReview) / 86400000 : 0;
    const nextDayRp = rp * Math.exp(-(skill.decayRate || 0.1));
    if (nextDayRp < 0.5 && daysSince > 1) {
      atRisk.push({ skillId, recallProbability: rp, tomorrowRp: nextDayRp, mastery: skill.mastery });
    }
  }
  return atRisk.sort((a, b) => a.tomorrowRp - b.tomorrowRp);
}
