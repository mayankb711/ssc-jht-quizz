/* ============================================================
   local.js — IndexedDB mirror. Always works offline. The single
   source of truth the app reads from; Supabase syncs INTO this.
   Stores: settings, attempts, mastery, cache (AI explanations).
   ============================================================ */

const DB = 'sscjht';
const VER = 3;
let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VER);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      const oldVer = e.oldVersion;
      if (oldVer < 1) {
        db.createObjectStore('kv');
        db.createObjectStore('attempts', { keyPath: 'id' });
        db.createObjectStore('cache');
        db.createObjectStore('generated_questions', { keyPath: 'id' });
      }
      if (oldVer < 2) {
        if (!db.objectStoreNames.contains('generated_questions')) {
          db.createObjectStore('generated_questions', { keyPath: 'id' });
        }
      }
      if (oldVer < 3) {
        const kv = e.target.transaction.objectStore('kv');
        kv.put(3, 'db_schema_version');
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function stampVersion(obj, version) {
  if (obj && typeof obj === 'object') {
    obj.__v = version || 1;
  }
  return obj;
}

export async function kvDelete(key) {
  const s = await tx('kv', 'readwrite');
  return new Promise((res, rej) => {
    const r = s.delete(key);
    r.onsuccess = () => res(true);
    r.onerror = () => rej(r.error);
  });
}

export async function tx(store, mode) {
  const db = await open();
  return db.transaction(store, mode).objectStore(store);
}

// ---- generic KV (settings, mastery, progress) ----
export async function kvGet(key, fallback = null) {
  const s = await tx('kv', 'readonly');
  return new Promise((res) => {
    const r = s.get(key);
    r.onsuccess = () => res(r.result ?? fallback);
    r.onerror = () => res(fallback);
  });
}
export async function kvSet(key, val) {
  const s = await tx('kv', 'readwrite');
  return new Promise((res, rej) => {
    const r = s.put(val, key);
    r.onsuccess = () => res(val);
    r.onerror = () => rej(r.error);
  });
}

// ---- attempts (every answered question) ----
export async function addAttempt(a) {
  stampVersion(a, 1);
  const s = await tx('attempts', 'readwrite');
  return new Promise((res, rej) => {
    const r = s.add(a);
    r.onsuccess = () => res(a);
    r.onerror = () => rej(r.error);
  });
}
export async function allAttempts() {
  const s = await tx('attempts', 'readonly');
  return new Promise((res) => {
    const r = s.getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => res([]);
  });
}

export async function replaceAttempts(attempts) {
  const db = await open();
  const txr = db.transaction('attempts', 'readwrite');
  const store = txr.objectStore('attempts');
  await new Promise((res, rej) => {
    const clear = store.clear();
    clear.onsuccess = () => res();
    clear.onerror = () => rej(clear.error);
  });
  for (const attempt of attempts || []) {
    if (!attempt || !attempt.id) continue;
    stampVersion(attempt, 1);
    await new Promise((res, rej) => {
      const r = store.put(attempt);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  }
}

// ---- AI cache (key -> text). Forever cache = pay-once. ----
export async function cacheGet(key) {
  const s = await tx('cache', 'readonly');
  return new Promise((res) => {
    const r = s.get(key);
    r.onsuccess = () => res(r.result ?? null);
    r.onerror = () => res(null);
  });
}
export async function cacheSet(key, val) {
  const s = await tx('cache', 'readwrite');
  return new Promise((res) => {
    const r = s.put(val, key);
    r.onsuccess = () => res(val);
    r.onerror = () => res(null);
  });
}

// ---- generated questions (AI-backed, persisted locally) ----
export async function upsertGeneratedQuestion(question) {
  stampVersion(question, 1);
  const s = await tx('generated_questions', 'readwrite');
  return new Promise((res, rej) => {
    const r = s.put(question);
    r.onsuccess = () => res(question);
    r.onerror = () => rej(r.error);
  });
}

export async function allGeneratedQuestions() {
  try {
    const s = await tx('generated_questions', 'readonly');
    return new Promise((res) => {
      const r = s.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => res([]);
    });
  } catch {
    return [];
  }
}

export async function getGeneratedQuestion(id) {
  try {
    const s = await tx('generated_questions', 'readonly');
    return new Promise((res) => {
      const r = s.get(id);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}
