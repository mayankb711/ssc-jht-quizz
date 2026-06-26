import { QUESTIONS } from '../data/questions.js';
import { TOPICS, topicById } from '../data/topics.js';
import { kvGet, kvSet } from '../store/local.js';
import { getGeneratedBank } from '../ai/client.js';
import { logError } from './diagnostics.js';

const SEARCH_INDEX_KEY = 'search_index_v1';

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function buildIndex(questions) {
  const index = {};
  for (const q of questions) {
    const words = new Set([
      ...tokenize(q.stem),
      ...tokenize((q.explain || '')),
      ...tokenize(q.id),
      ...tokenize(q.topic),
      ...tokenize(q.skill || ''),
      ...tokenize(q.subtopic || ''),
      ...tokenize((q.concept_tags || []).join(' ')),
      ...tokenize((q.vocabulary || []).join(' ')),
    ]);
    for (const word of words) {
      if (word.length < 2) continue;
      if (!index[word]) index[word] = [];
      if (!index[word].includes(q.id)) index[word].push(q.id);
    }
  }
  return index;
}

export async function rebuildSearchIndex() {
  try {
    const generated = await getGeneratedBank().catch(() => []);
    const all = [...QUESTIONS, ...generated];
    const index = buildIndex(all);
    await kvSet(SEARCH_INDEX_KEY, index);
    return Object.keys(index).length;
  } catch (e) {
    logError(e, { file: 'search.js', func: 'rebuildSearchIndex', action: 'build full-text search index', source: 'core' });
    return 0;
  }
}

export async function searchQuestions(query) {
  try {
    const terms = tokenize(query);
    if (!terms.length) return [];

    const index = await kvGet(SEARCH_INDEX_KEY, null);
    if (!index) {
      await rebuildSearchIndex();
      return searchQuestions(query);
    }

    const generated = await getGeneratedBank().catch(() => []);
    const all = [...QUESTIONS, ...generated];
    const byId = {};
    for (const q of all) byId[q.id] = q;

    const resultSets = terms.map(term => index[term] || []);
    if (!resultSets.length || resultSets.some(s => !s.length)) return [];

    const intersection = resultSets.reduce((acc, set) =>
      acc.filter(id => set.includes(id))
    );

    return intersection.map(id => byId[id]).filter(Boolean);
  } catch (e) {
    logError(e, { file: 'search.js', func: 'searchQuestions', action: 'full-text search', source: 'core' });
    return [];
  }
}

export async function searchByTopic(topic) {
  return QUESTIONS.filter(q => q.topic === topic);
}

export async function searchByTag(tag) {
  const lower = tag.toLowerCase();
  return QUESTIONS.filter(q =>
    (q.concept_tags || []).some(t => t.toLowerCase().includes(lower))
  );
}
