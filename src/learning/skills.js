export const SKILL_DOMAINS = {
  hindi: {
    id: 'hindi',
    label: 'General Hindi',
    skills: [
      { id: 'synonym', label: 'पर्यायवाची (Synonyms)', type: 'vocabulary' },
      { id: 'antonym', label: 'विलोम (Antonyms)', type: 'vocabulary' },
      { id: 'sentence_type', label: 'वाक्य रचना (Sentence)', type: 'grammar' },
      { id: 'terminology', label: 'शब्दावली (Terminology)', type: 'vocabulary' },
      { id: 'pada_parichay', label: 'पद परिचय (POS)', type: 'grammar' },
      { id: 'punctuation', label: 'विराम चिन्ह (Punctuation)', type: 'grammar' },
      { id: 'bias_free', label: 'पूर्वाग्रह-मुक्त (Bias-free)', type: 'writing' },
      { id: 'comprehension', label: 'गद्यांश बोध (Reading)', type: 'reading' },
      { id: 'spelling', label: 'वर्तनी (Spelling)', type: 'writing' },
      { id: 'idiom', label: 'मुहावरे (Idioms)', type: 'vocabulary' },
      { id: 'meaning', label: 'अर्थ (Meaning)', type: 'vocabulary' },
      { id: 'localization', label: 'स्थानीयकरण (Localization)', type: 'writing' },
    ],
  },
  english: {
    id: 'english',
    label: 'General English',
    skills: [
      { id: 'reading', label: 'Reading Comprehension', type: 'reading' },
      { id: 'cloze', label: 'Cloze Test', type: 'grammar' },
      { id: 'pqrs', label: 'Sentence Arrangement', type: 'grammar' },
      { id: 'narration', label: 'Narration', type: 'grammar' },
      { id: 'voice', label: 'Active/Passive Voice', type: 'grammar' },
      { id: 'oneword', label: 'One-word Substitution', type: 'vocabulary' },
      { id: 'spelling', label: 'Spelling', type: 'writing' },
      { id: 'antonym', label: 'Antonyms', type: 'vocabulary' },
      { id: 'synonym', label: 'Synonyms', type: 'vocabulary' },
      { id: 'homonym', label: 'Homonyms', type: 'vocabulary' },
      { id: 'idiom', label: 'Idioms & Phrases', type: 'vocabulary' },
      { id: 'error', label: 'Common Errors', type: 'grammar' },
      { id: 'improvement', label: 'Sentence Improvement', type: 'grammar' },
      { id: 'article', label: 'Articles', type: 'grammar' },
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
