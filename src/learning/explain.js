import { loadQuestionBank, getQuestionMeta } from './questionBank.js';
import { logError } from '../core/diagnostics.js';
import { getTrapForQuestion, getLinkedWeakZones, isDualAnswerFormat, isContraryToThemeFormat, isNotAMeaningFormat } from './paperAnalysis.js';

const REASON_PATTERNS = {
  grammar_mistake: {
    label: 'Grammar mistake',
    keywords: ['tense', 'voice', 'narration', 'article', 'preposition', 'conjunction'],
    icon: '📝',
  },
  vocabulary_confusion: {
    label: 'Vocabulary confusion',
    keywords: ['synonym', 'antonym', 'idiom', 'oneword', 'spelling', 'homonym', 'meaning'],
    icon: '📖',
  },
  false_synonym: {
    label: 'False synonym used',
    keywords: ['synonym', 'oneword', 'cloze'],
    icon: '🔄',
  },
  ignored_keyword: {
    label: 'Ignored a keyword',
    keywords: ['detail', 'inference', 'comprehension', 'reading', 'pqrs'],
    icon: '🔍',
  },
  translation_inversion: {
    label: 'Translation inversion',
    keywords: ['translation', 'localization', 'bias'],
    icon: '🔄',
  },
  terminology_confusion: {
    label: 'Terminology confusion',
    keywords: ['terminology', 'pada', 'economic', 'figure'],
    icon: '🏷️',
  },
  careless_error: {
    label: 'Careless mistake',
    keywords: ['careless'],
    icon: '⚡',
  },
  timed_out: {
    label: 'Ran out of time',
    keywords: ['timed out'],
    icon: '⏰',
  },
  misread_question: {
    label: 'Misread the question',
    keywords: ['misread'],
    icon: '👀',
  },
};

export function classifyReason(question, chosen, errorType) {
  if (errorType) {
    for (const [id, pattern] of Object.entries(REASON_PATTERNS)) {
      if (pattern.keywords.some(k => errorType.toLowerCase().includes(k))) {
        return { id, ...pattern };
      }
    }
  }
  const topic = (question.topic || '').toLowerCase();
  const skill = (question.skill || '').toLowerCase();
  for (const [id, pattern] of Object.entries(REASON_PATTERNS)) {
    if (pattern.keywords.some(k => topic.includes(k) || skill.includes(k))) {
      return { id, ...pattern };
    }
  }
  return { id: 'unknown', label: 'Review needed', icon: '🤔', keywords: [] };
}

export function generateDetailedExplanation(question, chosen, correct) {
  const reason = classifyReason(question, null, null);
  const correctAnswer = question.options[question.answer];
  const chosenAnswer = chosen != null ? question.options[chosen] : '(skipped)';
  const parts = [];
  if (!correct) {
    parts.push(`**${reason.icon} ${reason.label}**`);
    if (chosen != null) {
      parts.push(`Your answer: "${chosenAnswer}"`);
    }
    parts.push(`Correct answer: "${correctAnswer}"`);
  }
  const topicHint = getTopicBasedHint(question.topic);
  if (topicHint) parts.push(topicHint);
  const trap = getTrapForQuestion(question.id);
  if (trap && !correct) {
    parts.push(`\n⚠️ **Known Trap:** This matches the SSC CHT 2025 paper pattern. ${trap.label}: ${trap.trap}`);
  }
  if (isContraryToThemeFormat(question.topic) && !correct) {
    parts.push(`\n⚠️ **Format Alert:** This is a "contrary to theme" RC question. The correct answer NEGATES the passage's core theme, not just differs from it.`);
  }
  if (isNotAMeaningFormat(question.topic) && !correct) {
    parts.push(`\n⚠️ **Format Alert:** This is a "NOT a meaning" question. Some options ARE valid meanings — the answer is the one that belongs to a DIFFERENT word.`);
  }
  return parts.join('\n\n');
}

function getTopicBasedHint(topic) {
  const hints = {
    hi_terminology: '💡 Tip: Administrative terminology often uses Sanskrit-derived words. Look for the most formal option.',
    hi_translation: '💡 Tip: In translation, preserve the meaning, not the word order. Hindi and English have different sentence structures.',
    hi_comprehension: '💡 Tip: Read the question before the passage. Know what to look for.',
    en_voice: '💡 Tip: Ask: is the subject DOING or RECEIVING the action? Active = subject acts, Passive = subject receives.',
    en_narration: '💡 Tip: Remove quotes → change pronouns → backshift tense → change time words.',
    en_tense: '💡 Tip: Draw a timeline. Find the time reference in the sentence first.',
    en_error: '💡 Tip: Read aloud in your head. If it sounds wrong, it probably is.',
    en_improvement: '💡 Tip: Find the time reference first, then pick the matching tense.',
    en_cloze: '💡 Tip: Read the whole passage first before filling blanks.',
    en_pqrs: '💡 Tip: First sentence usually introduces the topic or person.',
    en_idiom: '💡 Tip: Visualize the literal meaning — the absurdity helps you remember.',
  };
  return hints[topic] || null;
}

export function generateHint(question, attemptCount) {
  if (attemptCount <= 0) return null;
  const hints = [];
  const topic = question.topic || '';
  const skill = question.skill || '';
  if (attemptCount === 1) {
    hints.push(`**Gentle hint:** Think about the ${skill || topic} concept involved here.`);
    const topicHint = getTopicBasedHint(topic);
    if (topicHint) hints.push(topicHint.replace('💡 Tip: ', ''));
  } else if (attemptCount === 2) {
    const wrongAnswers = [];
    question.options.forEach((opt, i) => {
      if (i !== question.answer) wrongAnswers.push(opt);
    });
    hints.push(`**Eliminate an option:** It's probably not "${wrongAnswers[0]}".`);
    const related = getRelatedConceptHint(question);
    if (related) hints.push(related);
  } else if (attemptCount === 3) {
    hints.push(`**Focus on:** ${question.explain ? getShortHint(question.explain) : skill || topic}`);
    const elimCount = 2;
    const wrongAnswers = [];
    question.options.forEach((opt, i) => {
      if (i !== question.answer && wrongAnswers.length < elimCount) wrongAnswers.push(opt);
    });
    if (wrongAnswers.length > 0) {
      hints.push(`Eliminated: "${wrongAnswers.join('", "')}"`);
    }
  } else if (attemptCount >= 4) {
    hints.push(`**The correct answer relates to:** ${(question.skill || question.topic || 'the main concept')}`);
  }
  return hints.join('\n\n');
}

function getShortHint(explain) {
  const sentences = explain.split(/[.!?]+/).filter(Boolean);
  const short = sentences.find(s => s.length < 100 && s.length > 10);
  return short || sentences[0] || explain.slice(0, 100);
}

function getRelatedConceptHint(question) {
  const conceptHints = {
    synonym: 'Think about meaning families — which word is closest in meaning?',
    antonym: 'Think about opposites — which word is the direct opposite?',
    tense: 'Identify the time reference in the sentence (past/present/future).',
    voice: 'Is the subject doing the action or receiving it?',
    narration: 'Who is speaking? Change pronouns first.',
    inference: 'The answer is not directly stated — you must infer from context.',
    detail: 'Scan the passage for specific facts. The answer is directly stated.',
    meaning: 'Think about the literal meaning vs figurative meaning.',
    spelling: 'Sound out the word syllable by syllable.',
  };
  const skill = (question.skill || '').toLowerCase();
  const topic = (question.topic || '').toLowerCase();
  for (const [key, hint] of Object.entries(conceptHints)) {
    if (skill.includes(key) || topic.includes(key)) return hint;
  }
  return null;
}

export async function getCounterfactual(question, chosen) {
  try {
    if (chosen == null) return null;
    const chosenOption = question.options[chosen];
    const correctOption = question.options[question.answer];
    if (!chosenOption || !correctOption) return null;
    const meta = await getQuestionMeta(question.id);
    if (meta.attempts < 2) return null;
    let prompt = '';
    const topic = (question.topic || '').toLowerCase();
    if (topic.includes('synonym') || topic.includes('antonym') || topic.includes('meaning') || topic.includes('oneword')) {
      prompt = `"${correctOption}" was correct. "${chosenOption}" was your answer. Can you think what change to the question would make "${chosenOption}" the right answer?`;
    } else if (topic.includes('tense') || topic.includes('voice') || topic.includes('narration')) {
      prompt = `"${correctOption}" was correct. If the time reference or voice were different, "${chosenOption}" could be right. Can you imagine how?`;
    } else if (topic.includes('translation') || topic.includes('localization')) {
      prompt = `"${correctOption}" is the correct translation. "${chosenOption}" would be correct if the source phrase had a different meaning. What change would make your answer valid?`;
    } else {
      prompt = `"${correctOption}" is correct. If the question were asking about "${chosenOption}" instead, what would the stem need to say?`;
    }
    return prompt;
  } catch (e) {
    logError(e, { file: 'explain.js', func: 'getCounterfactual' });
    return null;
  }
}
