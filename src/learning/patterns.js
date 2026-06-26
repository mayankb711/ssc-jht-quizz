import { allAttempts } from '../store/local.js';
import { QUESTIONS } from '../data/questions.js';
import { loadProfile } from './profile.js';
import { logError } from '../core/diagnostics.js';

export async function detectPatterns() {
  try {
    const attempts = await allAttempts();
    if (attempts.length < 10) return [];
    const patterns = [];
    const longQuestionPattern = detectLengthPattern(attempts);
    if (longQuestionPattern) patterns.push(longQuestionPattern);
    const translationPattern = detectTranslationPattern(attempts);
    if (translationPattern) patterns.push(translationPattern);
    const timeOfDayPattern = detectTimeOfDayPattern(attempts);
    if (timeOfDayPattern) patterns.push(timeOfDayPattern);
    const speedAccuracyPattern = detectSpeedAccuracyTradeoff(attempts);
    if (speedAccuracyPattern) patterns.push(speedAccuracyPattern);
    const consecutiveErrorPattern = detectConsecutiveErrors(attempts);
    if (consecutiveErrorPattern) patterns.push(consecutiveErrorPattern);
    const topicSpecificPattern = detectTopicSpecificPatterns(attempts);
    patterns.push(...topicSpecificPattern);
    const hesitationPattern = detectHesitationPattern(attempts);
    if (hesitationPattern) patterns.push(hesitationPattern);
    const difficultyDropPattern = detectDifficultyDropPattern(attempts);
    if (difficultyDropPattern) patterns.push(difficultyDropPattern);
    const confidencePattern = detectConfidencePattern(attempts);
    if (confidencePattern) patterns.push(confidencePattern);
    return patterns.sort((a, b) => b.severity - a.severity);
  } catch (e) {
    logError(e, { file: 'patterns.js', func: 'detectPatterns' });
    return [];
  }
}

function detectLengthPattern(attempts) {
  const questionMap = {};
  QUESTIONS.forEach(q => { questionMap[q.id] = q; });
  const longQs = attempts.filter(a => {
    const q = questionMap[a.question_id];
    if (!q) return false;
    const stemLen = (q.stem || '').length + (q.passage || '').length;
    return stemLen > 150;
  });
  const shortQs = attempts.filter(a => {
    const q = questionMap[a.question_id];
    if (!q) return false;
    const stemLen = (q.stem || '').length + (q.passage || '').length;
    return stemLen <= 150;
  });
  if (longQs.length < 3 || shortQs.length < 3) return null;
  const longAcc = longQs.filter(a => a.correct).length / longQs.length;
  const shortAcc = shortQs.filter(a => a.correct).length / shortQs.length;
  const diff = shortAcc - longAcc;
  if (diff > 0.15) {
    return {
      type: 'length_sensitivity',
      label: `Accuracy drops on long questions`,
      detail: `You score ${Math.round(shortAcc * 100)}% on short questions but ${Math.round(longAcc * 100)}% on long ones (${Math.round(diff * 100)}% drop). Try reading the questions before the passage.`,
      severity: Math.round(diff * 10),
      sampleSize: longQs.length + shortQs.length,
    };
  }
  return null;
}

function detectTranslationPattern(attempts) {
  const translationTopics = ['hi_translation', 'hi_localization', 'en_translation'];
  const transAttempts = attempts.filter(a => translationTopics.includes(a.topic));
  if (transAttempts.length < 3) return null;
  const incorrect = transAttempts.filter(a => !a.correct);
  if (incorrect.length < 2) return null;
  const errorTypes = {};
  incorrect.forEach(a => {
    if (a.errorType) errorTypes[a.errorType] = (errorTypes[a.errorType] || 0) + 1;
  });
  const topError = Object.entries(errorTypes).sort((a, b) => b[1] - a[1])[0];
  if (!topError || topError[1] < 2) return null;
  return {
    type: 'translation_difficulty',
    label: `Translation challenge: ${topError[0]}`,
    detail: `In translation questions, you most commonly make "${topError[0]}" errors (${topError[1]} times). Focus on terminology drill.`,
    severity: Math.round((topError[1] / incorrect.length) * 10),
    sampleSize: transAttempts.length,
  };
}

function detectTimeOfDayPattern(attempts) {
  const morning = [], afternoon = [], evening = [], night = [];
  attempts.forEach(a => {
    const h = new Date(a.ts).getHours();
    if (h >= 5 && h < 12) morning.push(a);
    else if (h >= 12 && h < 17) afternoon.push(a);
    else if (h >= 17 && h < 22) evening.push(a);
    else night.push(a);
  });
  const periods = [
    { label: 'Morning', data: morning },
    { label: 'Afternoon', data: afternoon },
    { label: 'Evening', data: evening },
    { label: 'Night', data: night },
  ].filter(p => p.data.length >= 5);
  if (periods.length < 2) return null;
  let best = periods[0], worst = periods[0];
  for (const p of periods) {
    const acc = p.data.filter(a => a.correct).length / p.data.length;
    p.accuracy = acc;
    if (acc > best.accuracy) best = p;
    if (acc < worst.accuracy) worst = p;
  }
  const diff = best.accuracy - worst.accuracy;
  if (diff > 0.12 && worst.accuracy < 0.5) {
    return {
      type: 'time_of_day',
      label: `Best time: ${best.label} (${Math.round(best.accuracy * 100)}%) vs Worst: ${worst.label} (${Math.round(worst.accuracy * 100)}%)`,
      detail: `You perform significantly better during ${best.label.toLowerCase()} (${Math.round(best.accuracy * 100)}%) than ${worst.label.toLowerCase()} (${Math.round(worst.accuracy * 100)}%). Consider scheduling study sessions in the ${best.label.toLowerCase()}.`,
      severity: Math.round(diff * 10),
      sampleSize: attempts.length,
    };
  }
  return null;
}

function detectSpeedAccuracyTradeoff(attempts) {
  const withTime = attempts.filter(a => a.responseTime != null && a.responseTime > 0);
  if (withTime.length < 10) return null;
  const sorted = [...withTime].sort((a, b) => a.responseTime - b.responseTime);
  const third = Math.floor(sorted.length / 3);
  const fast = sorted.slice(0, third);
  const slow = sorted.slice(-third);
  const fastAcc = fast.filter(a => a.correct).length / fast.length;
  const slowAcc = slow.filter(a => a.correct).length / slow.length;
  if (fastAcc - slowAcc > 0.15) {
    return {
      type: 'speed_accuracy_tradeoff',
      label: 'Rushing hurts accuracy',
      detail: `When you answer quickly (under ${Math.round(fast[fast.length - 1].responseTime / 1000)}s), accuracy is ${Math.round(fastAcc * 100)}%. When you take your time, it's ${Math.round(slowAcc * 100)}%. Slow down!`,
      severity: Math.round((fastAcc - slowAcc) * 10),
      sampleSize: withTime.length,
    };
  }
  if (slowAcc - fastAcc > 0.15) {
    return {
      type: 'overthinking',
      label: 'You overthink questions',
      detail: `When you take longer than ${Math.round(slow[0].responseTime / 1000)}s, accuracy drops to ${Math.round(slowAcc * 100)}% (vs ${Math.round(fastAcc * 100)}% when quick). Trust your first instinct.`,
      severity: Math.round((slowAcc - fastAcc) * 10),
      sampleSize: withTime.length,
    };
  }
  return null;
}

function detectConsecutiveErrors(attempts) {
  if (attempts.length < 5) return null;
  let maxConsecutiveWrong = 0;
  let currentWrong = 0;
  for (const a of attempts) {
    if (!a.correct) { currentWrong++; maxConsecutiveWrong = Math.max(maxConsecutiveWrong, currentWrong); }
    else currentWrong = 0;
  }
  if (maxConsecutiveWrong >= 3) {
    return {
      type: 'consecutive_errors',
      label: `Chain of ${maxConsecutiveWrong} consecutive wrong answers`,
      detail: `You had a streak of ${maxConsecutiveWrong} wrong answers in a row. When you get one wrong, take a moment to reset before the next question.`,
      severity: Math.min(maxConsecutiveWrong, 10),
      sampleSize: attempts.length,
    };
  }
  return null;
}

function detectTopicSpecificPatterns(attempts) {
  const patterns = [];
  const topicMap = {};
  attempts.forEach(a => {
    if (!a.topic) return;
    if (!topicMap[a.topic]) topicMap[a.topic] = [];
    topicMap[a.topic].push(a);
  });
  for (const [topic, topicAttempts] of Object.entries(topicMap)) {
    if (topicAttempts.length < 5) continue;
    const correct = topicAttempts.filter(a => a.correct).length;
    const acc = correct / topicAttempts.length;
    const recent5 = topicAttempts.slice(-5);
    const recentAcc = recent5.filter(a => a.correct).length / recent5.length;
    if (acc < 0.35 && topicAttempts.length >= 5) {
      patterns.push({
        type: 'persistent_weakness',
        label: `${topic} is a persistent weakness`,
        detail: `You've answered ${topicAttempts.length} questions in ${topic} with only ${Math.round(acc * 100)}% accuracy. Consider focused study on this topic.`,
        severity: Math.round((1 - acc) * 10),
        sampleSize: topicAttempts.length,
      });
    }
    if (recentAcc < acc - 0.2 && acc > 0.4) {
      patterns.push({
        type: 'declining_topic',
        label: `${topic} performance declining`,
        detail: `${topic} accuracy dropped from ${Math.round(acc * 100)}% overall to ${Math.round(recentAcc * 100)}% in recent attempts. Review this topic soon.`,
        severity: Math.round((acc - recentAcc) * 10),
        sampleSize: topicAttempts.length,
      });
    }
    if (recentAcc > acc + 0.2 && topicAttempts.length > 5) {
      patterns.push({
        type: 'improving_topic',
        label: `${topic} improving sharply`,
        detail: `${topic} accuracy rose from ${Math.round(acc * 100)}% to ${Math.round(recentAcc * 100)}% recently. Keep up the good work!`,
        severity: 0,
        sampleSize: topicAttempts.length,
      });
    }
  }
  return patterns;
}

function detectHesitationPattern(attempts) {
  const withHesitation = attempts.filter(a => a.hesitation != null && a.hesitation > 0);
  if (withHesitation.length < 5) return null;
  const hesCorrect = withHesitation.filter(a => a.correct).length / withHesitation.length;
  const noHesitation = attempts.filter(a => !a.hesitation || a.hesitation === 0);
  const noHesCorrect = noHesitation.length > 0 ? noHesitation.filter(a => a.correct).length / noHesitation.length : 0;
  if (hesCorrect < noHesCorrect - 0.12 && noHesitation.length >= 5) {
    return {
      type: 'hesitation',
      label: 'Hesitation correlates with wrong answers',
      detail: `When you change answers or hesitate, accuracy drops to ${Math.round(hesCorrect * 100)}% (vs ${Math.round(noHesCorrect * 100)}% when decisive).`,
      severity: Math.round((noHesCorrect - hesCorrect) * 10),
      sampleSize: withHesitation.length,
    };
  }
  return null;
}

function detectDifficultyDropPattern(attempts) {
  if (attempts.length < 10) return null;
  const recent20 = attempts.slice(-20);
  const chunks = [];
  for (let i = 0; i < recent20.length; i += 5) {
    chunks.push(recent20.slice(i, i + 5));
  }
  if (chunks.length < 2) return null;
  let dropping = true;
  let prevAcc = 1;
  for (const chunk of chunks) {
    const acc = chunk.filter(a => a.correct).length / chunk.length;
    if (acc > prevAcc - 0.05) { dropping = false; break; }
    prevAcc = acc;
  }
  if (dropping && prevAcc < 0.6) {
    return {
      type: 'fatigue_decline',
      label: 'Performance dropping — possible fatigue',
      detail: `Your accuracy has been steadily declining over the last ${recent20.length} questions. Consider taking a break.`,
      severity: Math.round((1 - prevAcc) * 8),
      sampleSize: recent20.length,
    };
  }
  return null;
}

function detectConfidencePattern(attempts) {
  const withConf = attempts.filter(a => a.confidence != null);
  if (withConf.length < 10) return null;
  const wrongHigh = withConf.filter(a => !a.correct && a.confidence >= 4);
  const correctLow = withConf.filter(a => a.correct && a.confidence <= 2);
  const dangerous = wrongHigh.length + correctLow.length;
  const total = withConf.length;
  if (dangerous / total > 0.15) {
    return {
      type: 'calibration_issue',
      label: `Confidence calibration needs work`,
      detail: `${wrongHigh.length} times you were confident but wrong, ${correctLow.length} times you were unsure but correct. That's ${Math.round(dangerous / total * 100)}% of answers where confidence didn't match reality.`,
      severity: Math.round((dangerous / total) * 10),
      sampleSize: total,
    };
  }
  return null;
}
