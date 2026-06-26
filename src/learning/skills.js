export const SKILL_DOMAINS = {
  hindi: {
    id: 'hindi',
    label: 'General Hindi',
    skills: [
      { id: 'synonym', label: 'पर्यायवाची (Synonyms)', type: 'vocabulary', subtypes: ['standard', 'shastriya', 'durlabh', 'all_real'] },
      { id: 'antonym', label: 'विलोम (Antonyms)', type: 'vocabulary', subtypes: ['direct', 'synonym_as_distractor'] },
      { id: 'sentence_type', label: 'वाक्य रचना (Sentence)', type: 'grammar', subtypes: ['sanyukt', 'mishra', 'sarl', 'not_type'] },
      { id: 'terminology', label: 'प्रशासनिक शब्दावली (Admin Terminology)', type: 'vocabulary', subtypes: ['hindi_to_english', 'english_to_hindi', 'sansadiya', 'same_letter'] },
      { id: 'pada_parichay', label: 'पद परिचय (POS Tagging)', type: 'grammar', subtypes: ['viseshan', 'kriya', 'kriya_viseshan', 'karak', 'dual_answer'] },
      { id: 'punctuation', label: 'विराम चिन्ह (Punctuation)', type: 'grammar', subtypes: ['naming', 'usage', 'double_punctuation', 'dash'] },
      { id: 'bias_free', label: 'पूर्वाग्रह-मुक्त (Bias-free)', type: 'writing', subtypes: ['content_preserving', 'not_neutral', 'three_element'] },
      { id: 'comprehension', label: 'गद्यांश बोध (Reading)', type: 'reading', subtypes: ['inference', 'figurative', 'attitude', 'detail', 'contrary_to_theme'] },
      { id: 'spelling', label: 'वर्तनी (Spelling)', type: 'writing', subtypes: ['isolated', 'in_sentence'] },
      { id: 'idiom', label: 'मुहावरे (Idioms)', type: 'vocabulary' },
      { id: 'meaning', label: 'सूक्ष्म अर्थ (Subtle Meaning)', type: 'vocabulary', subtypes: ['secondary', 'not_a_meaning', 'literal_vs_admin'] },
      { id: 'localization', label: 'स्थानीयकरण (Localization)', type: 'writing', subtypes: ['most_natural', 'most_unnatural', 'violation', 'foreign_phrase', 'inverse'] },
      { id: 'economic', label: 'आर्थिक शब्दावली (Economic Terms)', type: 'vocabulary', subtypes: ['definition', 'usage'] },
      { id: 'multimeaning', label: 'बहुअर्थी शब्द (Multiple Meanings)', type: 'vocabulary', subtypes: ['rarest', 'not_a_meaning'] },
      { id: 'jati_bhav', label: 'जातिवाचक→भाववाचक (Abstract Noun)', type: 'grammar', subtypes: ['not_format'] },
      { id: 'register', label: 'पंजी निर्धारण (Register)', type: 'reading', subtypes: ['government', 'literary', 'bureaucratic'] },
    ],
  },
  english: {
    id: 'english',
    label: 'General English',
    skills: [
      { id: 'reading', label: 'Reading Comprehension', type: 'reading', subtypes: ['grammar_analysis', 'vocabulary_in_context', 'main_concern', 'complex_vs_cc'] },
      { id: 'cloze', label: 'Cloze Test', type: 'grammar', subtypes: ['literary_vocab', 'tense', 'preposition', 'collocation', 'meaning'] },
      { id: 'pqrs', label: 'Sentence Arrangement', type: 'grammar', subtypes: ['chronological', 'biographical', 'argument', 'causal', 'process'] },
      { id: 'narration', label: 'Narration', type: 'grammar', subtypes: ['direct_to_indirect', 'indirect_to_direct', 'suggest_gerund', 'exclamatory', 'reporting_verb'] },
      { id: 'voice', label: 'Active/Passive Voice', type: 'grammar', subtypes: ['simple', 'continuous', 'perfect', 'perfect_infinitive', 'modal', 'ditransitive', 'stacked'] },
      { id: 'oneword', label: 'One-word Substitution', type: 'vocabulary', subtypes: ['medical', 'age', 'person', 'abstract'] },
      { id: 'spelling', label: 'Spelling', type: 'writing', subtypes: ['incorrectly_spelled', 'fill_correctly', 'which_correct'] },
      { id: 'antonym', label: 'Antonyms', type: 'vocabulary', subtypes: ['direct', 'near_antonym'] },
      { id: 'synonym', label: 'Synonyms', type: 'vocabulary', subtypes: ['direct', 'antonym_as_distractor', 'precision'] },
      { id: 'homonym', label: 'Homonyms/Homophones', type: 'vocabulary', subtypes: ['not_a_meaning', 'homophone_pair', 'same_sound'] },
      { id: 'idiom', label: 'Idioms & Phrases', type: 'vocabulary', subtypes: ['literal_trap', 'figurative'] },
      { id: 'error', label: 'Common Errors', type: 'grammar', subtypes: ['comparative', 'double_superlative', 'degree', 'tense'] },
      { id: 'improvement', label: 'Sentence Improvement', type: 'grammar', subtypes: ['tense_marker', 'past_continuous_vs_perfect'] },
      { id: 'article', label: 'Articles', type: 'grammar', subtypes: ['definite', 'indefinite', 'no_article', 'double_blank'] },
    ],
  },
};

export const SKILL_TYPES = {
  grammar: { label: 'Grammar', color: '#7c8cff' },
  vocabulary: { label: 'Vocabulary', color: '#27ae60' },
  reading: { label: 'Reading', color: '#f39c12' },
  writing: { label: 'Writing', color: '#e74c3c' },
};

export const CONCEPT_TAGS = [
  'tense', 'voice', 'narration', 'articles', 'prepositions', 'subject-verb-agreement',
  'conditional', 'modals', 'gerunds', 'participles', 'infinitives',
  'synonym', 'antonym', 'homonym', 'one-word-substitution', 'idiom',
  'spelling', 'punctuation', 'sentence-structure', 'word-order',
  'comprehension', 'inference', 'tone', 'main-idea', 'detail',
  'administrative-hindi', 'translation', 'official-language',
  'bias-free', 'localization', 'economic-terms',
  'verb-type', 'karak', 'sentence-type', 'compound-sentence', 'complex-sentence',
];

export function getSkillType(skillId) {
  for (const domain of Object.values(SKILL_DOMAINS)) {
    const s = domain.skills.find(sk => sk.id === skillId);
    if (s) return s.type;
  }
  return 'grammar';
}

export function getSkillLabel(skillId) {
  for (const domain of Object.values(SKILL_DOMAINS)) {
    const s = domain.skills.find(sk => sk.id === skillId);
    if (s) return s.label;
  }
  return skillId;
}
