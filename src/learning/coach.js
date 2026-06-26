import { allAttempts } from '../store/local.js';
import { loadProfile, predictScore } from './profile.js';
import { computeTopicVelocity, getLearningDNA } from './velocity.js';
import { detectPatterns } from './patterns.js';
import { logError } from '../core/diagnostics.js';
import { TOPICS } from '../data/topics.js';
import { APP } from '../config/app.js';

const SEVEN_DAYS = 7 * 86400000;

export async function generateDailyReport() {
  try {
    const profile = await loadProfile();
    const attempts = await allAttempts();
    const today = new Date().toDateString();
    const todayAttempts = attempts.filter(a => new Date(a.ts).toDateString() === today);
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const yesterdayAttempts = attempts.filter(a => new Date(a.ts).toDateString() === yesterday);
    const velocity = await computeTopicVelocity();
    const patterns = await detectPatterns();
    const dna = await getLearningDNA();
    const currentScore = predictScore(profile);
    const todayCorrect = todayAttempts.filter(a => a.correct).length;
    const todayTotal = todayAttempts.length;
    const todayAccuracy = todayTotal > 0 ? todayCorrect / todayTotal : 0;
    const todayTopics = {};
    todayAttempts.forEach(a => {
      if (!a.topic) return;
      if (!todayTopics[a.topic]) todayTopics[a.topic] = { correct: 0, total: 0, totalTime: 0, speedCount: 0 };
      todayTopics[a.topic].total++;
      if (a.correct) todayTopics[a.topic].correct++;
      if (a.responseTime) { todayTopics[a.topic].totalTime += a.responseTime; todayTopics[a.topic].speedCount++; }
    });
    const yesterdayAccuracy = yesterdayAttempts.length > 0
      ? yesterdayAttempts.filter(a => a.correct).length / yesterdayAttempts.length : null;
    const report = {
      date: today,
      summary: '',
      sections: [],
      metrics: {
        questionsAnswered: todayTotal,
        correct: todayCorrect,
        accuracy: todayAccuracy,
        score: currentScore,
        streak: profile.streak.current,
        totalQuestions: profile.totalQuestions,
        timeSpent: todayAttempts.filter(a => a.responseTime).reduce((s, a) => s + a.responseTime, 0),
      },
      patterns: patterns.slice(0, 3),
      recommendations: [],
    };
    const sections = [];
    if (todayAccuracy >= 0.8) {
      sections.push({ type: 'praise', text: `Excellent session! ${Math.round(todayAccuracy * 100)}% accuracy today.` });
    } else if (todayAccuracy >= 0.6) {
      sections.push({ type: 'encourage', text: `Good effort with ${Math.round(todayAccuracy * 100)}% accuracy. Keep building consistency.` });
    } else if (todayAccuracy > 0) {
      sections.push({ type: 'encourage', text: `Today was challenging (${Math.round(todayAccuracy * 100)}% accuracy). Review is key.` });
    } else {
      sections.push({ type: 'neutral', text: 'No practice recorded today. Every question brings you closer to your goal.' });
    }
    const improved = [], declined = [], steady = [];
    for (const [topic, v] of Object.entries(velocity)) {
      if (v.masteryTrend > 0.1) improved.push(topic);
      else if (v.masteryTrend < -0.1) declined.push(topic);
      else if (Math.abs(v.masteryTrend) <= 0.1) steady.push(topic);
    }
    const topicLabels = {};
    TOPICS.forEach(t => { topicLabels[t.id] = t.label; });
    if (improved.length > 0) {
      sections.push({
        type: 'improvement',
        text: `Improved: ${improved.map(t => topicLabels[t] || t).join(', ')}`,
      });
    }
    if (declined.length > 0) {
      sections.push({
        type: 'warning',
        text: `Declining: ${declined.map(t => topicLabels[t] || t).join(', ')} — review recommended`,
      });
    }
    if (todayTopics) {
      const topicEntries = Object.entries(todayTopics);
      if (topicEntries.length > 0) {
        const worstToday = topicEntries
          .map(([t, d]) => ({ topic: t, acc: d.total > 0 ? d.correct / d.total : 0 }))
          .sort((a, b) => a.acc - b.acc)[0];
        if (worstToday && worstToday.acc < 0.5) {
          sections.push({
            type: 'focus',
            text: `Focus area: ${topicLabels[worstToday.topic] || worstToday.topic} (${Math.round(worstToday.acc * 100)}% today)`,
          });
        }
      }
    }
    const timeSpentMinutes = Math.round(report.metrics.timeSpent / 60000);
    if (timeSpentMinutes > 0) {
      sections.push({ type: 'time', text: `Study time: ~${timeSpentMinutes} minutes` });
    }
    if (yesterdayAccuracy != null) {
      const trend = todayAccuracy - yesterdayAccuracy;
      if (trend > 0.05) sections.push({ type: 'trend', text: `📈 Up ${Math.round(trend * 100)}% from yesterday` });
      else if (trend < -0.05) sections.push({ type: 'trend', text: `📉 Down ${Math.round(Math.abs(trend) * 100)}% from yesterday` });
    }
    if (dna.recommendations.length > 0) {
      sections.push({ type: 'dna', text: dna.recommendations[0] });
    }
    report.sections = sections;
    const nextStudyMin = estimateNextStudyMinutes(profile, todayAccuracy);
    report.recommendations.push({
      type: 'next_session',
      text: `Recommended study: ~${nextStudyMin} minutes`,
    });
    if (patterns.length > 0 && patterns[0].severity > 5) {
      report.recommendations.push({
        type: 'pattern',
        text: `Pattern detected: ${patterns[0].label}`,
      });
    }
    if (profile.streak.current > 0) {
      report.recommendations.push({
        type: 'streak',
        text: `Keep your ${profile.streak.current}-day streak alive!`,
      });
    }
    const predictedScore = predictScore(profile);
    if (predictedScore != null) {
      report.recommendations.push({
        type: 'score',
        text: `Current predicted score: ${predictedScore}/200`,
      });
    }
    return report;
  } catch (e) {
    logError(e, { file: 'coach.js', func: 'generateDailyReport' });
    return { date: new Date().toDateString(), summary: 'Keep practicing!', sections: [], metrics: {}, recommendations: [] };
  }
}

function estimateNextStudyMinutes(profile, todayAccuracy) {
  if (profile.totalQuestions < 10) return 15;
  const dueReviews = Object.values(profile.skills).filter(s => s.nextReview && s.nextReview <= Date.now()).length;
  const baseMinutes = Math.min(45, Math.max(10, Math.round(profile.totalQuestions * 0.15)));
  const accuracyPenalty = todayAccuracy < 0.5 ? 10 : 0;
  const reviewBonus = dueReviews * 2;
  return Math.min(60, baseMinutes + accuracyPenalty + reviewBonus);
}

export async function generateWeeklyReport() {
  try {
    const attempts = await allAttempts();
    const now = Date.now();
    const weekAttempts = attempts.filter(a => (now - a.ts) < SEVEN_DAYS);
    const prevWeekAttempts = attempts.filter(a => {
      const age = now - a.ts;
      return age >= SEVEN_DAYS && age < 14 * 86400000;
    });
    const velocity = await computeTopicVelocity();
    const dna = await getLearningDNA();
    const profile = await loadProfile();
    const currentScore = predictScore(profile);
    const report = {
      date: new Date().toDateString(),
      week: getWeekRange(),
      sections: [],
      recommendations: [],
    };
    const thisWeekCorrect = weekAttempts.filter(a => a.correct).length;
    const thisWeekTotal = weekAttempts.length;
    const thisWeekAcc = thisWeekTotal > 0 ? thisWeekCorrect / thisWeekTotal : 0;
    const prevWeekCorrect = prevWeekAttempts.filter(a => a.correct).length;
    const prevWeekTotal = prevWeekAttempts.length;
    const prevWeekAcc = prevWeekTotal > 0 ? prevWeekCorrect / prevWeekTotal : 0;
    const sections = [];
    sections.push({
      type: 'weekly_summary',
      text: `This week: ${thisWeekTotal} questions, ${Math.round(thisWeekAcc * 100)}% accuracy`,
    });
    if (prevWeekTotal > 0) {
      const change = thisWeekAcc - prevWeekAcc;
      if (change > 0.05) sections.push({ type: 'improvement', text: `📈 Accuracy improved by ${Math.round(change * 100)}% compared to last week` });
      else if (change < -0.05) sections.push({ type: 'warning', text: `📉 Accuracy dropped by ${Math.round(Math.abs(change) * 100)}% compared to last week` });
      else sections.push({ type: 'steady', text: `Accuracy stable at ~${Math.round(thisWeekAcc * 100)}%` });
    }
    const topicStats = {};
    weekAttempts.forEach(a => {
      if (!a.topic) return;
      if (!topicStats[a.topic]) topicStats[a.topic] = { correct: 0, total: 0, totalTime: 0, speedCount: 0 };
      topicStats[a.topic].total++;
      if (a.correct) topicStats[a.topic].correct++;
      if (a.responseTime) { topicStats[a.topic].totalTime += a.responseTime; topicStats[a.topic].speedCount++; }
    });
    const topicLabels = {};
    TOPICS.forEach(t => { topicLabels[t.id] = t.label; });
    for (const [topic, v] of Object.entries(velocity)) {
      if (v.mastery > 0.75 && v.velocity > 0.3) {
        sections.push({ type: 'ready', text: `${topicLabels[topic] || topic}: ready for harder material (mastery ${Math.round(v.mastery * 100)}%)` });
      }
      if (v.daysUntilForgetting < 3 && v.attempts > 0) {
        sections.push({ type: 'retention', text: `${topicLabels[topic] || topic}: review needed every ${Math.round(v.daysUntilForgetting)} days` });
      }
    }
    const plateauing = Object.entries(velocity).filter(([t, v]) => v.attempts >= 5 && Math.abs(v.masteryTrend) < 0.05);
    if (plateauing.length > 0) {
      sections.push({
        type: 'plateau',
        text: `Plateauing: ${plateauing.slice(0, 2).map(([t]) => topicLabels[t] || t).join(', ')} — try a different approach`,
      });
    }
    if (currentScore != null) {
      sections.push({
        type: 'score',
        text: `Predicted SSC score: ${currentScore}/200. ${currentScore >= 160 ? 'On track for a strong score!' : currentScore >= 120 ? 'Making solid progress.' : 'Keep building foundation.'}`,
      });
    }
    if (dna.strengths.length > 0) {
      sections.push({
        type: 'strengths',
        text: `Strengths: ${dna.strengths.slice(0, 3).map(t => topicLabels[t] || t).join(', ')}`,
      });
    }
    if (dna.weaknesses.length > 0) {
      sections.push({
        type: 'weaknesses',
        text: `Focus areas: ${dna.weaknesses.slice(0, 3).map(t => topicLabels[t] || t).join(', ')}`,
      });
    }
    report.sections = sections;
    if (velocity) {
      const fastTopics = Object.entries(velocity).filter(([, v]) => v.velocity > 0.3);
      const slowTopics = Object.entries(velocity).filter(([, v]) => v.velocity < 0.1);
      if (fastTopics.length > 0) {
        report.recommendations.push(`Fastest learning: ${fastTopics[0][0]} (velocity ${fastTopics[0][1].velocity.toFixed(2)})`);
      }
      if (slowTopics.length > 0) {
        report.recommendations.push(`Slowest learning: ${slowTopics[0][0]} — consider changing study strategy`);
      }
    }
    const totalTimeMs = weekAttempts.filter(a => a.responseTime).reduce((s, a) => s + a.responseTime, 0);
    const totalMinutes = Math.round(totalTimeMs / 60000);
    if (totalMinutes > 0) {
      report.recommendations.push(`Total study time this week: ~${totalMinutes} minutes`);
    }
    report.recommendations.push(`Learning archetype: ${dna.archetype || 'Developing'}`);
    return report;
  } catch (e) {
    logError(e, { file: 'coach.js', func: 'generateWeeklyReport' });
    return { date: new Date().toDateString(), week: '', sections: [], recommendations: [] };
  }
}

function getWeekRange() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return `${startOfWeek.toDateString()} — ${endOfWeek.toDateString()}`;
}
