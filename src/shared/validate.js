export function assertObject(value, name = 'value') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

export function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function isQuestionShape(q) {
  return !!q && typeof q === 'object' && typeof q.id === 'string' && typeof q.topic === 'string' && Array.isArray(q.options) && q.options.length === 4;
}

export function normalizeList(list, predicate = (x) => x != null) {
  return Array.isArray(list) ? list.filter(predicate) : [];
}
