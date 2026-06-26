import { QUESTIONS } from '../data/questions.js';
import { getGeneratedBank } from '../ai/client.js';
import { logError } from '../core/diagnostics.js';

const CONCEPT_RELATIONS = {
  'voice': { related: ['narration', 'tense', 'sentence-type'], parent: 'grammar' },
  'narration': { related: ['voice', 'tense', 'reported-speech'], parent: 'grammar' },
  'tense': { related: ['voice', 'narration', 'improvement'], parent: 'grammar' },
  'synonym': { related: ['antonym', 'vocabulary', 'oneword'], parent: 'vocabulary' },
  'antonym': { related: ['synonym', 'vocabulary'], parent: 'vocabulary' },
  'idiom': { related: ['vocabulary', 'phrase'], parent: 'vocabulary' },
  'comprehension': { related: ['inference', 'reading', 'detail'], parent: 'reading' },
  'spelling': { related: ['punctuation', 'writing'], parent: 'writing' },
  'translation': { related: ['terminology', 'localization', 'bias-free'], parent: 'writing' },
  'terminology': { related: ['translation', 'administrative-hindi'], parent: 'vocabulary' },
};

const VOCABULARY_REGISTRY = {};

const RULE_REGISTRY = {};

export class KnowledgeGraph {
  constructor() {
    this.concepts = new Map();
    this.vocab = new Map();
    this.rules = new Map();
    this.questions = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    try {
      const generated = await getGeneratedBank().catch(() => []);
      const all = [...QUESTIONS, ...generated];
      for (const q of all) {
        this.questions.set(q.id, q);
        const concepts = this.extractConcepts(q);
        const vocab = this.extractVocabulary(q);
        for (const c of concepts) {
          if (!this.concepts.has(c)) this.concepts.set(c, { id: c, label: c, questions: [], relations: CONCEPT_RELATIONS[c] || { related: [], parent: null } });
          this.concepts.get(c).questions.push(q.id);
        }
        for (const v of vocab) {
          if (!this.vocab.has(v)) this.vocab.set(v, { id: v, label: v, questions: [], related: [] });
          this.vocab.get(v).questions.push(q.id);
        }
        if (q.explain) {
          const rules = this.extractRules(q);
          for (const r of rules) {
            if (!this.rules.has(r)) this.rules.set(r, { id: r, label: r, questions: [], concepts: [] });
            this.rules.get(r).questions.push(q.id);
            this.rules.get(r).concepts.push(...concepts);
          }
        }
      }
      this.initialized = true;
    } catch (e) {
      logError(e, { file: 'graph.js', func: 'init', action: 'build knowledge graph', source: 'learning' });
    }
  }

  extractConcepts(q) {
    const concepts = [q.topic];
    if (q.skill) concepts.push(q.skill);
    if (q.concept_tags) concepts.push(...q.concept_tags);
    const stemLower = (q.stem || '').toLowerCase();
    for (const [cid, info] of Object.entries(CONCEPT_RELATIONS)) {
      if (concepts.includes(cid) || stemLower.includes(cid)) {
        concepts.push(...info.related.filter(c => !concepts.includes(c)));
      }
    }
    return [...new Set(concepts)];
  }

  extractVocabulary(q) {
    const words = [];
    if (q.vocabulary) words.push(...q.vocabulary);
    const stem = q.stem || '';
    if (q.lang === 'en') {
      const capWords = stem.match(/\b[A-Z][a-z]{3,}\b/g) || [];
      words.push(...capWords);
    }
    return [...new Set(words.map(w => w.toLowerCase()))];
  }

  extractRules(q) {
    const rules = [];
    const explain = q.explain || '';
    const patterns = [
      /rule:\s*([^.;]+)/gi,
      /नियम:\s*([^.;]+)/gi,
      /principle:\s*([^.;]+)/gi,
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(explain)) !== null) {
        rules.push(m[1].trim());
      }
    }
    if (rules.length === 0 && explain.length > 30) {
      const short = explain.split('.')[0].trim();
      if (short.length > 15) rules.push(short);
    }
    return rules;
  }

  getRelatedQuestions(questionId, limit = 5) {
    const q = this.questions.get(questionId);
    if (!q) return [];
    const concepts = this.extractConcepts(q);
    const scored = [];
    for (const [id, other] of this.questions) {
      if (id === questionId) continue;
      const otherConcepts = this.extractConcepts(other);
      const overlap = concepts.filter(c => otherConcepts.includes(c)).length;
      if (overlap > 0) {
        scored.push({ question: other, score: overlap });
      }
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.question);
  }

  getConceptsForQuestion(questionId) {
    const q = this.questions.get(questionId);
    if (!q) return [];
    return this.extractConcepts(q);
  }

  getRulesForQuestion(questionId) {
    const q = this.questions.get(questionId);
    if (!q) return [];
    return this.extractRules(q);
  }

  getVocabularyForQuestion(questionId) {
    const q = this.questions.get(questionId);
    if (!q) return [];
    return this.extractVocabulary(q);
  }

  getQuestionsForConcept(concept) {
    const c = this.concepts.get(concept);
    return c ? c.questions.map(id => this.questions.get(id)).filter(Boolean) : [];
  }

  getRelatedConcepts(concept) {
    const c = this.concepts.get(concept);
    if (!c || !c.relations) return [];
    return c.relations.related;
  }

  getLearningPath(startConcept, endConcept) {
    const visited = new Set();
    const queue = [[startConcept, [startConcept]]];
    while (queue.length > 0) {
      const [current, path] = queue.shift();
      if (current === endConcept) return path;
      if (visited.has(current)) continue;
      visited.add(current);
      const relations = CONCEPT_RELATIONS[current];
      if (relations) {
        for (const next of relations.related) {
          if (!visited.has(next)) {
            queue.push([next, [...path, next]]);
          }
        }
      }
    }
    return null;
  }
}

export const knowledgeGraph = new KnowledgeGraph();
