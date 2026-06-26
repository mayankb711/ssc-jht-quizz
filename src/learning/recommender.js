import { allAttempts } from '../store/local.js';
import { loadProfile, getDueReviews, getPredictiveWeaknesses, getWeakestSkills } from './profile.js';
import { loadQuestionBank, getQuestionMeta } from './questionBank.js';
import { knowledgeGraph, KnowledgeGraph } from './graph.js';
import { logError } from '../core/diagnostics.js';
import { getCHTTopicWeight, getLinkedWeakZones, getPaperInformedRecommendations } from './paperAnalysis.js';

export async function computeEKG(question, profile, qb) {
  try {
    const meta = qb[question.id] || { attempts: 0, correct: 0, totalTime: 0, speedSamples: 0 };
    const allAttemptsData = await allAttempts();
    const previousAttempts = allAttemptsData.filter(a => a.question_id === question.id);
    const skill = question.skill || 'general';
    const skillState = profile.skills[skill];
    let knowledgeGap = 0.5;
    if (skillState && skillState.attempts >= 2) {
      knowledgeGap = Math.max(0, 0.5 - (skillState.mastery - 0.3));
    }
    let recallUrgency = 0;
    if (skillState && skillState.nextReview && skillState.nextReview <= Date.now()) {
      recallUrgency = 0.3;
    }
    let noveltyBonus = 0;
    if (meta.attempts === 0) {
      noveltyBonus = 0.25;
    }
    let difficultyBonus = 0;
    if (previousAttempts.length >= 2) {
      const recentCorrect = previousAttempts.slice(-2).filter(a => a.correct).length;
      if (recentCorrect === 2) difficultyBonus = -0.1;
      else if (recentCorrect === 0) difficultyBonus = 0.15;
    }
    let timePenalty = 0;
    if (meta.speedSamples > 2) {
      const avgTime = meta.totalTime / meta.speedSamples;
      if (avgTime > 30000) timePenalty = -0.1;
      else if (avgTime < 5000 && meta.correct / meta.attempts > 0.8) timePenalty = -0.2;
    }
    let weaknessBonus = 0;
    if (skillState && skillState.attempts >= 2 && skillState.mastery < 0.4) {
      weaknessBonus = 0.3;
    }
    let dueReviewBonus = 0;
    if (skillState && skillState.nextReview && skillState.nextReview <= Date.now()) {
      dueReviewBonus = 0.2;
    }
    let paperWeightBonus = 0;
    const pWeight = getCHTTopicWeight(question.topic || '');
    if (pWeight > 0.1) paperWeightBonus = pWeight * 0.3;
    const rawScore = knowledgeGap + recallUrgency + noveltyBonus + difficultyBonus + timePenalty + weaknessBonus + dueReviewBonus + paperWeightBonus;
    const ekg = Math.max(0, Math.min(1, rawScore));
    let reason = 'random';
    if (weaknessBonus > 0) reason = 'weak_skill';
    else if (dueReviewBonus > 0) reason = 'due_review';
    else if (noveltyBonus > 0) reason = 'unseen';
    else if (knowledgeGap > 0.3) reason = 'knowledge_gap';
    return { ekg, reason, components: { knowledgeGap, recallUrgency, noveltyBonus, difficultyBonus, timePenalty, weaknessBonus, dueReviewBonus } };
  } catch (e) {
    logError(e, { file: 'recommender.js', func: 'computeEKG' });
    return { ekg: 0.5, reason: 'fallback', components: {} };
  }
}

export async function rankQuestionsByEKG(questions, limit = 20) {
  if (!questions || questions.length === 0) return [];
  const profile = await loadProfile();
  const qb = await loadQuestionBank();
  const scored = [];
  for (const q of questions) {
    const { ekg, reason } = await computeEKG(q, profile, qb);
    scored.push({ question: q, score: ekg, reason });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export async function getRecommendedFocus() {
  try {
    const profile = await loadProfile();
    const dueReviews = getDueReviews(profile);
    if (dueReviews.length > 0) {
      return {
        type: 'due_review',
        skill: dueReviews[0].skillId,
        reason: `${dueReviews.length} reviews due — recall probability as low as ${Math.round(dueReviews[0].recallProbability * 100)}%`,
      };
    }
    const predictive = getPredictiveWeaknesses(profile);
    if (predictive.length > 0) {
      return {
        type: 'predictive',
        skill: predictive[0].skillId,
        reason: `${predictive[0].skillId} at risk of forgetting (tomorrow recall: ${Math.round(predictive[0].tomorrowRp * 100)}%)`,
      };
    }
    const weakest = getWeakestSkills(profile, 1);
    if (weakest.length > 0) {
      return {
        type: 'weakness',
        skill: weakest[0].id,
        reason: `${weakest[0].id} is weakest (mastery: ${Math.round(weakest[0].mastery * 100)}%)`,
      };
    }
    const paperRecs = await getPaperInformedRecommendations();
    if (paperRecs.length > 0 && paperRecs[0].type === 'linked_weak_zone') {
      return {
        type: 'paper_zone',
        skill: paperRecs[0].zone,
        reason: paperRecs[0].message,
      };
    }
    return { type: 'balanced', skill: null, reason: 'Continue balanced practice' };
  } catch (e) {
    logError(e, { file: 'recommender.js', func: 'getRecommendedFocus' });
    return { type: 'balanced', skill: null, reason: 'Continue balanced practice' };
  }
}

export async function getCuriosityRecommendation(questionId) {
  try {
    const allAttemptsData = await allAttempts();
    const attempts = allAttemptsData.filter(a => a.question_id === questionId);
    if (attempts.length < 2) return null;
    const recent3 = attempts.slice(-3);
    const allWrong = recent3.every(a => !a.correct);
    if (!allWrong) return null;
    const qb = await loadQuestionBank();
    const meta = qb[questionId];
    if (!meta || meta.attempts < 2) return null;
    const question = await findQuestion(questionId);
    if (!question) return null;
    const skill = question.skill || question.topic || 'general';
    return {
      type: 'mini_lesson',
      skill,
      title: `Mastering ${skill}`,
      steps: [
        { label: 'Concept review', description: `Review the key rules for ${skill}` },
        { label: 'Examples drill', description: 'Practice with 5 worked examples' },
        { label: 'Test yourself', description: '3 targeted questions on this concept' },
      ],
      questionId,
      failCount: meta.failCount,
    };
  } catch (e) {
    logError(e, { file: 'recommender.js', func: 'getCuriosityRecommendation' });
    return null;
  }
}

export async function getConceptLinking(questionId) {
  try {
    const related = knowledgeGraph.getRelatedQuestions(questionId, 5);
    const allAttemptsData = await allAttempts();
    const linked = [];
    for (const rq of related) {
      const attempts = allAttemptsData.filter(a => a.question_id === rq.id);
      const lastAttempt = attempts[attempts.length - 1];
      linked.push({
        question: rq,
        lastAttempted: lastAttempt || null,
        wasWrong: lastAttempt ? !lastAttempt.correct : false,
        commonMistake: attempts.filter(a => !a.correct).length > attempts.filter(a => a.correct).length,
      });
    }
    return linked;
  } catch (e) {
    logError(e, { file: 'recommender.js', func: 'getConceptLinking' });
    return [];
  }
}

export async function getAutoFlashcards(questionId, count = 3) {
  try {
    const allAttemptsData = await allAttempts();
    const wrongAttempts = allAttemptsData.filter(a => a.question_id === questionId && !a.correct);
    if (wrongAttempts.length === 0) return [];
    const question = await findQuestion(questionId);
    if (!question) return [];
    const skill = question.skill || question.topic || 'general';
    const cards = [];
    cards.push({
      type: 'flashcard',
      front: `What is the correct answer?`,
      back: `${question.options[question.answer]}`,
      tag: skill,
      revisionDate: new Date(Date.now() + 86400000).toDateString(),
    });
    const explanationSummary = question.explain ? question.explain.slice(0, 200) : 'Review the concept';
    cards.push({
      type: 'memory_trick',
      front: `How to remember: ${skill}`,
      back: explanationSummary,
      tag: skill,
      revisionDate: new Date(Date.now() + 3 * 86400000).toDateString(),
    });
    if (wrongAttempts.length >= 2) {
      cards.push({
        type: 'example',
        front: `Where you went wrong`,
        back: `You chose "${question.options[wrongAttempts[0].chosen]}" but the correct answer was "${question.options[question.answer]}". Remember: ${question.explain || 'review the concept'}`,
        tag: skill,
        revisionDate: new Date(Date.now() + 7 * 86400000).toDateString(),
      });
    }
    return cards.slice(0, count);
  } catch (e) {
    logError(e, { file: 'recommender.js', func: 'getAutoFlashcards' });
    return [];
  }
}

async function findQuestion(questionId) {
  const { QUESTIONS } = await import('../data/questions.js');
  const { getGeneratedBank } = await import('../ai/client.js');
  const q = QUESTIONS.find(q => q.id === questionId);
  if (q) return q;
  const generated = await getGeneratedBank();
  return generated.find(q => q.id === questionId);
}
