import { allAttempts } from '../store/local.js';
import { loadProfile } from './profile.js';
import { logError } from '../core/diagnostics.js';
import { TOPICS } from '../data/topics.js';

export const CHT_2025 = {
  meta: {
    exam: 'SSC Combined Hindi Translators Examination 2025',
    date: '12 August 2025',
    totalQuestions: 200,
    hindiCount: 100,
    englishCount: 100,
  },
  topicDistribution: {
    hindi: [
      { topic: 'hi_comprehension', count: 20, label: 'अनुच्छेद खंड (4 passages × 5)' },
      { topic: 'hi_terminology', count: 11, label: 'प्रशासनिक शब्दावली' },
      { topic: 'hi_synonym', count: 12, label: 'पर्यायवाची शब्द' },
      { topic: 'hi_sentence_type', count: 12, label: 'वाक्य रचना/शुद्धि' },
      { topic: 'hi_pada_parichay', count: 8, label: 'पद परिचय' },
      { topic: 'hi_punctuation', count: 7, label: 'विराम चिह्न' },
      { topic: 'hi_bias_free', count: 5, label: 'पूर्वग्रह-मुक्त अभिव्यक्तियाँ' },
      { topic: 'hi_antonym', count: 5, label: 'विलोम शब्द' },
      { topic: 'hi_economic', count: 4, label: 'आर्थिक शब्दावली' },
      { topic: 'hi_localization', count: 3, label: 'स्थानीयकरण' },
      { topic: 'hi_multimeaning', count: 3, label: 'सूक्ष्म एवं स्वाभाविक अर्थ' },
      { topic: 'hi_spelling', count: 1, label: 'वर्तनी' },
      { topic: 'hi_idiom', count: 1, label: 'मुहावरे' },
      { topic: 'hi_jati_bhav', count: 1, label: 'जातिवाचक→भाववाचक' },
    ],
    english: [
      { topic: 'en_reading', count: 15, label: 'Reading Comprehension (3 passages)' },
      { topic: 'en_cloze', count: 15, label: 'Cloze Test (3 passages × 5 blanks)' },
      { topic: 'en_pqrs', count: 12, label: 'Sentence Arrangement (PQRS)' },
      { topic: 'en_oneword', count: 5, label: 'One Word Substitution' },
      { topic: 'en_spelling', count: 5, label: 'Spellings' },
      { topic: 'en_antonym', count: 5, label: 'Antonyms' },
      { topic: 'en_synonym', count: 5, label: 'Synonyms' },
      { topic: 'en_homonym', count: 5, label: 'Homonyms/Homophones' },
      { topic: 'en_idiom', count: 5, label: 'Idioms/Phrases' },
      { topic: 'en_narration', count: 6, label: 'Narration' },
      { topic: 'en_voice', count: 6, label: 'Voice' },
      { topic: 'en_error', count: 4, label: 'Common Errors' },
      { topic: 'en_article', count: 4, label: 'Articles' },
      { topic: 'en_improvement', count: 3, label: 'Sentence Improvement' },
    ],
  },
  trapRegistry: {
    hindi: [
      { q: 65, label: 'आत्मा for मन', trap: 'आत्मा=ultimate self; अन्तःकरण=inner faculty', correct: 'अन्तःकरण' },
      { q: 93, label: 'हाथी for सारंग', trap: 'हाथी IS real meaning; संगीत राग is rarer', correct: 'संगीत राग' },
      { q: 46, label: 'कार्यकर्ताओं को तैनात', trap: 'changes ACT (deploy≠instruct)', correct: 'घरेलू सहायकों को निर्देश' },
      { q: 38, label: 'प्रतिमान for Per mensem', trap: 'प्रतिमान=standard/norm', correct: 'प्रतिमास' },
      { q: 33, label: 'Agreement for समायोजन', trap: 'Agreement=समझौता', correct: 'Adjustment' },
      { q: 78, label: 'स्पष्ट for विलोम of गूढ़', trap: 'both partially work; सरल is more precise', correct: 'सरल' },
      { q: 66, label: 'परामर्शात्मक for तदनुसार', trap: 'तदनुसार=mandatory in government language', correct: 'बाध्यकारी कार्यान्वयन' },
      { q: 49, label: 'समीर for वायु', trap: 'समीर=poetic Urdu; Vedic/philosophical=मारुत', correct: 'मारुत' },
      { q: 41, label: 'निर्भर for विलोम of आश्रित', trap: 'निर्भर=SYNONYM not antonym', correct: 'स्वतंत्र' },
      { q: 89, label: 'गहन परीक्षण for अवलोकन', trap: 'question asks literal meaning', correct: 'साधारण देखने की प्रक्रिया' },
      { q: 24, label: 'भूत for काल', trap: 'भूत IS a meaning but temporal; सूक्ष्म=मृत्यु', correct: 'मृत्यु' },
      { q: 11, label: 'Consistent statement for contrary', trap: 'question asks for CONTRARY to theme', correct: 'मंगलसूत्र बेचने से मर्यादा घटती है' },
      { q: 76, label: 'जुगाड़ for NOT-व्यंग्यार्थ', trap: 'valid व्यंग्यार्थ; NOT=inverted implication', correct: 'किस्मत ही असफल होने का कारण' },
    ],
    english: [
      { q: 160, label: 'Earnest for Prefunctory', trap: 'ANTONYM of Prefunctory not synonym', correct: 'Cursory' },
      { q: 108, label: 'Gerund for participle', trap: 'gerund=noun; "moving" modifies objects=participle', correct: 'Present participle as adjective' },
      { q: 107, label: 'Compound-Complex for Complex', trap: 'count main clauses; only 1 = Complex', correct: 'Complex sentence' },
      { q: 145, label: 'to check after suggest', trap: 'suggest+infinitive=wrong', correct: 'checking' },
      { q: 197, label: 'Supercede for Supersede', trap: 'only -sede word = Supersede', correct: 'Supersede' },
      { q: 153, label: 'Floor for flour', trap: 'floor=/flɔːr/; flour=/flaʊər/', correct: 'Flower' },
      { q: 144, label: 'Impulse for Proclivity', trap: 'sudden urge≠gradual inclination', correct: 'Tendency' },
      { q: 133, label: 'had worked for was working', trap: 'completed≠in-progress when interrupted', correct: 'was working' },
      { q: 176, label: 'Stubborn for Intransigent', trap: 'general obstinacy≠specific refusal', correct: 'Unyielding' },
    ],
  },
  questionTypePatterns: {
    dualAnswerFormat: ['hi_pada_parichay'],
    notAMeaning: ['hi_multimeaning', 'en_homonym'],
    contraryToTheme: ['hi_comprehension'],
    allRealSynonyms: ['hi_synonym'],
    sameFirstLetterDistractors: ['hi_terminology'],
    inSentenceFormat: ['hi_spelling'],
  },
  linkedWeakZones: [
    { zone: 'Administrative Vocabulary', topics: ['hi_terminology', 'hi_multimeaning', 'hi_economic'], skill: 'register_sensitivity' },
    { zone: 'Synonym Depth', topics: ['hi_synonym', 'en_synonym', 'en_oneword'], skill: 'vocabulary_discrimination' },
    { zone: 'Sentence Structure', topics: ['hi_sentence_type', 'en_improvement', 'en_error'], skill: 'sentence_analysis' },
    { zone: 'Grammar in Context', topics: ['en_reading', 'en_cloze', 'en_error'], skill: 'contextual_grammar' },
    { zone: 'Word Precision', topics: ['en_oneword', 'en_synonym', 'en_antonym'], skill: 'semantic_precision' },
    { zone: 'Register Sensitivity', topics: ['hi_localization', 'hi_bias_free', 'hi_terminology'], skill: 'register_awareness' },
    { zone: 'Pada Parichay', topics: ['hi_pada_parichay', 'hi_sentence_type'], skill: 'grammatical_function' },
  ],
  difficultyCalibration: {
    hardestFormats: ['contrary_to_theme_rc', 'not_a_vyangyarth', 'all_philosophical_synonyms', 'complex_stacked_voice', 'complex_vs_compound_complex', 'perfect_infinitive_passive'],
    easiestPickups: ['viram_chihn_usage', 'simple_antonyms', 'basic_voice', 'vakya_rachna_simple'],
    notTested: ['sandhi', 'samas', 'ras', 'chhand', 'alankar'],
  },
  pqrsPatterns: [
    { type: 'Chronological', pattern: '2-1-3-5-4', description: 'Need→Founding→Official→Expand→Present' },
    { type: 'Biographical', pattern: '3-2-1-4', description: 'Intro→Challenge→Works→Influence' },
    { type: 'Argument', pattern: '5-1-3-2-4', description: 'Define→State→Mechanism→Effect1→Effect2' },
    { type: 'Process', pattern: 'QSRP', description: 'Discovery→Revealed→How→Despite' },
  ],
};

export function getCHTTopicWeight(topicId) {
  for (const subject of ['hindi', 'english']) {
    const entry = CHT_2025.topicDistribution[subject].find(t => t.topic === topicId);
    if (entry) return entry.count / (subject === 'hindi' ? 100 : 100);
  }
  return 0.05;
}

export function getTrapForQuestion(questionId) {
  if (!questionId) return null;
  for (const subject of ['hindi', 'english']) {
    const trap = CHT_2025.trapRegistry[subject].find(t => questionId.includes(String(t.q)));
    if (trap) return trap;
  }
  return null;
}

export function getLinkedWeakZones(topicId) {
  return CHT_2025.linkedWeakZones.filter(z => z.topics.includes(topicId));
}

export function isDualAnswerFormat(topic) {
  return CHT_2025.questionTypePatterns.dualAnswerFormat.includes(topic);
}

export function isContraryToThemeFormat(topic) {
  return CHT_2025.questionTypePatterns.contraryToTheme.includes(topic);
}

export function isNotAMeaningFormat(topic) {
  return CHT_2025.questionTypePatterns.notAMeaning.includes(topic);
}

export async function getPaperInformedRecommendations() {
  try {
    const profile = await loadProfile();
    const attempts = await allAttempts();
    const recs = [];
    const topicAttempts = {};
    attempts.forEach(a => {
      if (!a.topic) return;
      if (!topicAttempts[a.topic]) topicAttempts[a.topic] = { correct: 0, total: 0 };
      topicAttempts[a.topic].total++;
      if (a.correct) topicAttempts[a.topic].correct++;
    });
    for (const zone of CHT_2025.linkedWeakZones) {
      const zoneAttempts = zone.topics.filter(t => topicAttempts[t]).reduce((s, t) => s + topicAttempts[t].total, 0);
      const zoneCorrect = zone.topics.filter(t => topicAttempts[t]).reduce((s, t) => s + topicAttempts[t].correct, 0);
      if (zoneAttempts >= 3) {
        const acc = zoneCorrect / zoneAttempts;
        if (acc < 0.5) {
          recs.push({
            type: 'linked_weak_zone',
            zone: zone.zone,
            accuracy: acc,
            topics: zone.topics,
            skill: zone.skill,
            message: `${zone.zone} is a connected weak area (${Math.round(acc * 100)}%). Practice these topics together.`,
          });
        }
      }
    }
    const hindiTopics = CHT_2025.topicDistribution.hindi;
    for (const t of hindiTopics) {
      const stats = topicAttempts[t.topic];
      if (!stats || stats.total < t.count * 0.3) {
        recs.push({
          type: 'paper_weight',
          topic: t.topic,
          weight: t.count,
          message: `${t.label} (${t.count} marks in CHT 2025) — prioritize based on paper weight`,
        });
      }
    }
    return recs;
  } catch (e) {
    logError(e, { file: 'paperAnalysis.js', func: 'getPaperInformedRecommendations' });
    return [];
  }
}

export function getExamStrategy() {
  return {
    mostMarks: [
      { topic: 'hi_comprehension', marks: 20, label: 'अनुच्छेद खंड (hardest)' },
      { topic: 'en_cloze', marks: 15, label: 'Cloze Test (moderate)' },
      { topic: 'en_pqrs', marks: 12, label: 'PQRS (learnable patterns)' },
      { topic: 'hi_synonym', marks: 12, label: 'पर्यायवाची (deep vocabulary needed)' },
    ],
    easiestPickups: [
      'विराम चिह्न usage — identify sentence type',
      'Simple antonyms (IMPERVIOUS→Permeable)',
      'Basic voice conversion (may not be bought→may not buy)',
      'वाक्य रचना simple identification (सरल/संयुक्त/मिश्र)',
    ],
    hardestInPaper: [
      'NOT-a-व्यंग्यार्थ (Q76) — requires understanding inversion',
      'All-4-philosophical synonyms (Q65) — depth beyond recognition',
      'Contrary-to-theme RC (Q11) — passage-level synthesis',
      'Complex stacked passive voice (Q195) — multi-layer preservation',
      'Complex vs Compound-Complex (Q107, Q113, Q118) — clause counting',
    ],
    timeAllocation: {
      rcAndCloze: 'Read passage once, answer 5 questions',
      pqrs: 'If confident, fast. If confused, skip (negative marking)',
      vocabulary: 'Fastest if known, fastest to skip if not',
    },
  };
}
