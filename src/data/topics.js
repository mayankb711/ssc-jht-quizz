/* ============================================================
   topics.js — taxonomy extracted from the 12-Aug-2025 PYQ paper.
   Each topic has an id, label (EN + HI), subject, and the skills
   the adaptive engine tracks mastery against. Derived from the
   deep PYQ analysis (see PYQ_INSIGHTS.md), not generic syllabus.
   ============================================================ */

export const SUBJECTS = {
  hi: { id: 'hi', label: 'General Hindi',  labelHi: 'सामान्य हिन्दी' },
  en: { id: 'en', label: 'General English', labelHi: 'सामान्य अंग्रेज़ी' },
};

// Share of the 100 questions per subject — EXACT counts from the
// 12-Aug-2025 paper analysis (paper_analysis.txt, lines 14–83 & 527–596).
export const TOPIC_SHARE = {
  // ---- Hindi (Q.1–Q100) ----
  hi_comprehension:    20,  // 4 passages × 5 Qs (Q2–Q21)
  hi_terminology:      11,  // प्रशासनिक शब्दावली (Q33,35,39,42,44,45,48,59,66,87,97)
  hi_synonym:          12,  // पर्यायवाची शब्द (Q22,26,36,49,65,69,85,90,92,96,100 + extras)
  hi_sentence_type:    12,  // वाक्य रचना/शुद्धि (Q25,27,31,32,40,54,55,62,63,73,77,79)
  hi_pada_parichay:     8,  // पद परिचय (Q34,43,64,68,75,82,83,94)
  hi_punctuation:       7,  // विराम चिह्न (Q23,47,50,58,67,71,81)
  hi_bias_free:         5,  // पूर्वाग्रह-मुक्त (Q28,46,51,53,70,72)
  hi_antonym:           5,  // विलोम (Q41,78,85,90)
  hi_economic:          4,  // आर्थिक शब्दावली (Q52,61,88,89)
  hi_multimeaning:      3,  // सूक्ष्म अर्थ (Q24,60,93)
  hi_localization:      3,  // स्थानीयकरण (Q1,38,56,74,99)
  hi_spelling:          4,  // वर्तनी (Q30,37,77,98)
  hi_idiom:             1,  // मुहावरे (Q57)
  hi_jati_bhav:         1,  // जातिवाचक→भाववाचक (Q84)
  hi_figure:            1,  // व्यंग्यार्थ (Q76)
  hi_meaning:           2,  // अर्थ/व्याख्या (Q29,95)

  // ---- English (Q.101–Q200) ----
  en_reading:          15,  // RC 3 passages (Q107–Q121)
  en_cloze:            15,  // Cloze 3 passages × 5 (Q102–Q106, Q122–Q131)
  en_pqrs:             12,  // Sentence Arrangement PQRS (Q134,137,139...)
  en_narration:         6,  // Narration (Q136,145,150,171,172,189)
  en_voice:             6,  // Voice (Q143,158,175,180,195,200)
  en_oneword:           5,  // One-word Substitution (Q138,157,163,183,194)
  en_spelling:          5,  // Spellings (Q141,146,152,192,196,197)
  en_antonym:           5,  // Antonyms (Q147,170,184,186,187)
  en_synonym:           5,  // Synonyms (Q144,149,156,160,176)
  en_homonym:           5,  // Homonyms/Homophones (Q153,155,159,164,177)
  en_idiom:             5,  // Idioms/Phrases (Q101,154,169,188,190)
  en_error:             5,  // Common Errors (Q135,140,168,174,179)
  en_article:           4,  // Articles (Q117,132,142,165,182)
  en_improvement:       5,  // Sentence Improvement/tense (Q133,162,167,193,198)
  en_grammar:           4,  // Grammar in context (Q107,108,112,113)
};

// topic.id is stable and used by the engine.
export const TOPICS = [
  // ---- HINDI ---- (skills + shares drawn from the exact PYQ stems)
  { id: 'hi_comprehension', subject: 'hi', share: 20,
    label: 'गद्यांश बोध / Comprehension', labelHi: 'गद्यांश बोध',
    skills: ['inference','tone','detail','contrary'] },

  { id: 'hi_synonym', subject: 'hi', share: 12,
    label: 'पर्यायवाची शब्द', labelHi: 'पर्यायवाची',
    skills: ['common','classical','rarest','all_real'] },

  { id: 'hi_sentence_type', subject: 'hi', share: 12,
    label: 'वाक्य रचना (सरल/संयुक्त/मिश्र/शुद्धि)', labelHi: 'वाक्य रचना',
    skills: ['classify','identify','not_x','gender'] },

  { id: 'hi_terminology', subject: 'hi', share: 11,
    label: 'प्रशासनिक / पारिभाषिक शब्दावली', labelHi: 'प्रशासनिक शब्द',
    skills: ['hi_to_en','en_to_hi','context','register'] },

  { id: 'hi_pada_parichay', subject: 'hi', share: 8,
    label: 'पद परिचय (क्रिया/कारक/विशेषण)', labelHi: 'पद परिचय',
    skills: ['verb_type','karak','adjective','adverb','dual'] },

  { id: 'hi_punctuation', subject: 'hi', share: 7,
    label: 'विराम चिन्ह', labelHi: 'विराम चिन्ह',
    skills: ['name','usage','double'] },

  { id: 'hi_bias_free', subject: 'hi', share: 5,
    label: 'पूर्वाग्रह-मुक्त अभिव्यक्ति', labelHi: 'पूर्वाग्रह-मुक्त भाषा',
    skills: ['rewrite','identify','content_preserve'] },

  { id: 'hi_antonym', subject: 'hi', share: 5,
    label: 'विलोम शब्द', labelHi: 'विलोम',
    skills: ['common','rare','synonym_trap'] },

  { id: 'hi_spelling', subject: 'hi', share: 4,
    label: 'शुद्ध वर्तनी', labelHi: 'वर्तनी',
    skills: ['identify','insentence'] },

  { id: 'hi_economic', subject: 'hi', share: 4,
    label: 'आर्थिक शब्दावली', labelHi: 'आर्थिक शब्द',
    skills: ['definition','context'] },

  { id: 'hi_localization', subject: 'hi', share: 3,
    label: 'स्थानीयकरण / Localization', labelHi: 'स्थानीयकरण',
    skills: ['violate','unnatural','naturalized'] },

  { id: 'hi_multimeaning', subject: 'hi', share: 3,
    label: 'सूक्ष्म अर्थ (बहुअर्थी शब्द)', labelHi: 'सूक्ष्म अर्थ',
    skills: ['subtle','rarest','not_meaning'] },

  { id: 'hi_meaning', subject: 'hi', share: 2,
    label: 'अर्थ / व्याख्या', labelHi: 'अर्थ',
    skills: ['identify'] },

  { id: 'hi_idiom', subject: 'hi', share: 1,
    label: 'मुहावरे', labelHi: 'मुहावरे',
    skills: ['meaning'] },

  { id: 'hi_jati_bhav', subject: 'hi', share: 1,
    label: 'जातिवाचक → भाववाचक संज्ञा', labelHi: 'जातिवाचक/भाववाचक',
    skills: ['identify','not_x'] },

  { id: 'hi_figure', subject: 'hi', share: 1,
    label: 'व्यंग्यार्थ', labelHi: 'व्यंग्यार्थ',
    skills: ['identify','not_x'] },

  // ---- ENGLISH ---- (Q.101–Q200)
  { id: 'en_reading', subject: 'en', share: 15,
    label: 'Reading Comprehension', labelHi: 'गद्यांश',
    skills: ['inference','detail','grammar_in_context','tone','title'] },

  { id: 'en_cloze', subject: 'en', share: 15,
    label: 'Cloze Test (passage fill-in)', labelHi: 'रिक्त स्थान (गद्यांश)',
    skills: ['tense','verb_form','vocab','phrase'] },

  { id: 'en_pqrs', subject: 'en', share: 12,
    label: 'Sentence Arrangement (PQRS)', labelHi: 'वाक्य क्रम',
    skills: ['chronological','biographical','argument','causal','process'] },

  { id: 'en_narration', subject: 'en', share: 6,
    label: 'Narration (Direct/Indirect)', labelHi: 'विधि (Direct/Indirect)',
    skills: ['indirect_to_direct','direct_to_indirect','exclamatory','question'] },

  { id: 'en_voice', subject: 'en', share: 6,
    label: 'Voice (Active/Passive)', labelHi: 'वाच्य (Active/Passive)',
    skills: ['simple','continuous','perfect','modal','infinitive','stacked'] },

  { id: 'en_oneword', subject: 'en', share: 5,
    label: 'One-word Substitution', labelHi: 'एक-शब्द प्रयोग',
    skills: ['age','medical','person','legal'] },

  { id: 'en_spelling', subject: 'en', share: 5,
    label: 'Spelling', labelHi: 'वर्तनी',
    skills: ['identify_correct','identify_wrong','fill_blank'] },

  { id: 'en_antonym', subject: 'en', share: 5,
    label: 'Antonyms', labelHi: 'विलोम',
    skills: ['common','advanced','synonym_trap'] },

  { id: 'en_synonym', subject: 'en', share: 5,
    label: 'Synonyms', labelHi: 'समानार्थी',
    skills: ['common','advanced','antonym_trap'] },

  { id: 'en_homonym', subject: 'en', share: 5,
    label: 'Homonyms / Homophones', labelHi: 'समनाम',
    skills: ['not_meaning','homophone'] },

  { id: 'en_idiom', subject: 'en', share: 5,
    label: 'Idioms & Phrases', labelHi: 'मुहावरे',
    skills: ['meaning'] },

  { id: 'en_error', subject: 'en', share: 5,
    label: 'Common Errors / Spotting', labelHi: 'अशुद्धि पहचान',
    skills: ['superlative','double_comp','degree','agreement'] },

  { id: 'en_improvement', subject: 'en', share: 5,
    label: 'Sentence Improvement (tense)', labelHi: 'वाक्य सुधार',
    skills: ['past_continuous','future_perfect','past_perfect'] },

  { id: 'en_article', subject: 'en', share: 4,
    label: 'Articles', labelHi: 'Articles',
    skills: ['definite','indefinite','zero','double_blank'] },

  { id: 'en_grammar', subject: 'en', share: 4,
    label: 'Grammar in Context', labelHi: 'व्याकरण',
    skills: ['sentence_type','participle','gerund'] },
];

export const topicById = (id) => TOPICS.find(t => t.id === id);
export const topicsBySubject = (subj) => TOPICS.filter(t => t.subject === subj);
