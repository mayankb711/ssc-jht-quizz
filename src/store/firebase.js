/*
  firebase.js — Cloud layer via Firestore REST API.
  Each device gets its own document keyed by a device UUID.
  No SDK needed — works with just a projectId + Web API Key.
*/

import { kvGet, kvSet, allAttempts, allGeneratedQuestions, upsertGeneratedQuestion, replaceAttempts, addAttempt } from './local.js';

let _config = null;
let _deviceId = null;
let _syncInProgress = false;
let _lastSyncTs = 0;
let _listeners = [];
let _online = navigator.onLine;

window.addEventListener('online', () => { _online = true; notify(); });
window.addEventListener('offline', () => { _online = false; notify(); });

export function onAuthChange(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

function notify() {
  _listeners.forEach(fn => fn(getStatus()));
}

export function getStatus() {
  return {
    configured: !!_config,
    signedIn: !!_deviceId,
    user: _deviceId ? { id: _deviceId } : null,
    syncInProgress: _syncInProgress,
    lastSyncTs: _lastSyncTs,
    lastSyncAt: _lastSyncTs ? new Date(_lastSyncTs).toLocaleString() : null,
    online: _online,
  };
}

export function isOnline() { return _online; }

async function getOrCreateDeviceId() {
  let id = await kvGet('firebase_device_id');
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    await kvSet('firebase_device_id', id);
  }
  return id;
}

// ---- Firestore REST helpers ----
function fsUrl(projectId) {
  return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(projectId) + '/databases/(default)/documents';
}

function fsDocUrl(projectId, collection, docId) {
  return fsUrl(projectId) + '/' + encodeURIComponent(collection) + '/' + encodeURIComponent(docId) + '?key=' + encodeURIComponent(_config.apiKey);
}

function fromFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue, 10);
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.arrayValue?.values) out[k] = v.arrayValue.values.map(item => {
      if (item.stringValue !== undefined) return item.stringValue;
      if (item.integerValue !== undefined) return parseInt(item.integerValue, 10);
      return item;
    });
    else if (v.mapValue?.fields) out[k] = fromFields(v.mapValue.fields);
  }
  return out;
}

function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map(item => {
      if (typeof item === 'string') return { stringValue: item };
      if (typeof item === 'number') return { integerValue: String(item) };
      return { stringValue: JSON.stringify(item) };
    }) } };
  }
  return fields;
}

// ---- Config ----
export async function configure() {
  const projectId = await kvGet('fb_project_id');
  const apiKey = await kvGet('fb_api_key');
  if (!projectId || !apiKey) { _config = null; _deviceId = null; notify(); return false; }
  try {
    _config = { projectId, apiKey };
    _deviceId = await getOrCreateDeviceId();
    notify();
    return true;
  } catch (e) {
    console.warn('Firebase configure failed:', e);
    _config = null; _deviceId = null; notify(); return false;
  }
}

export async function getSession() {
  return _deviceId ? { user: { id: _deviceId } } : null;
}

export function signInMagic() { throw new Error('Firebase uses device ID instead of email sign-in'); }
export async function signOut() {
  _deviceId = null; notify();
}

async function touchSyncTs() {
  _lastSyncTs = Date.now();
  await kvSet('firebase_last_sync_ts', _lastSyncTs);
  notify();
}

// ---- Firestore document helpers ----
async function userDocUrl() {
  return fsDocUrl(_config.projectId, 'users', _deviceId);
}

async function readDoc() {
  const url = await userDocUrl();
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Firestore read failed: ' + res.status);
  const data = await res.json();
  return fromFields(data.fields);
}

async function writeDoc(update) {
  const doc = { fields: toFields(update) };
  const res = await fetch(await userDocUrl(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error('Firestore write failed: ' + res.status);
  return res.json();
}

// ---- Record one attempt ----
export async function recordAttempt(attempt) {
  await addAttempt(attempt);
  if (!_config || !_deviceId || !_online) return;
  try {
    const existing = await readDoc();
    const attempts = existing?.attempts ? JSON.parse(existing.attempts) : [];
    attempts.push(attempt);
    await writeDoc({
      attempts: JSON.stringify(attempts),
      ts: new Date().toISOString(),
      settings: existing?.settings || '{}',
      questions: existing?.questions || '[]',
      bookmarks: existing?.bookmarks || '[]',
    });
    await touchSyncTs();
  } catch (e) {
    console.warn('Firebase recordAttempt failed:', e);
  }
}

// ---- Fetch attempts from cloud ----
export async function fetchAttempts() {
  if (!_config || !_deviceId || !_online) return;
  try {
    const doc = await readDoc();
    if (!doc?.attempts) return;
    const cloudAttempts = JSON.parse(doc.attempts);
    if (!cloudAttempts.length) return;
    const local = new Map((await allAttempts()).map(a => [a.id, a]));
    let changed = false;
    for (const r of cloudAttempts) {
      const have = local.get(r.id);
      if (!have || (r.ts || 0) >= (have.ts || 0)) {
        local.set(r.id, r);
        changed = true;
      }
    }
    if (changed) await replaceAttempts([...local.values()]);
    await touchSyncTs();
  } catch (e) {
    console.warn('Firebase fetchAttempts failed:', e);
  }
}

async function readAllAndMerge() {
  if (!_config || !_deviceId || !_online) return;
  try {
    const doc = await readDoc();
    if (!doc) return;
    // merge attempts
    if (doc.attempts) {
      const cloudAttempts = JSON.parse(doc.attempts);
      if (cloudAttempts.length) {
        const local = new Map((await allAttempts()).map(a => [a.id, a]));
        let changed = false;
        for (const r of cloudAttempts) {
          const have = local.get(r.id);
          if (!have || (r.ts || 0) >= (have.ts || 0)) {
            local.set(r.id, r);
            changed = true;
          }
        }
        if (changed) await replaceAttempts([...local.values()]);
      }
    }
    // merge settings
    if (doc.settings) {
      const settings = JSON.parse(doc.settings);
      if (settings.theme) {
        await kvSet('theme', settings.theme);
        document.documentElement.setAttribute('data-theme', settings.theme);
      }
      if (settings.neuron_cap) await kvSet('neuron_cap', settings.neuron_cap);
    }
    // merge questions
    if (doc.questions) {
      const qs = JSON.parse(doc.questions);
      for (const q of qs) {
        if (q?.id) await upsertGeneratedQuestion(q);
      }
    }
    // merge bookmarks
    if (doc.bookmarks) {
      const bookmarks = JSON.parse(doc.bookmarks);
      if (Array.isArray(bookmarks) && bookmarks.length) {
        await kvSet('bookmarks', bookmarks);
      }
    }
    await touchSyncTs();
  } catch (e) {
    console.warn('Firebase readAllAndMerge failed:', e);
  }
}

export async function fetchAll() {
  await readAllAndMerge();
}

// ---- Batch push ----
export async function push() {
  if (!_config) return { ok: false, reason: 'not-configured' };
  if (!_deviceId) return { ok: false, reason: 'no-session' };
  if (_syncInProgress) return { ok: false, reason: 'sync-in-progress' };
  _syncInProgress = true; notify();
  try {
    const lastSync = await kvGet('firebase_last_sync_ts', 0);
    const allAttemptsLocal = (await allAttempts()).filter(a => a.ts > lastSync);
    const settings = {
      theme: await kvGet('theme', 'dark'),
      neuron_cap: await kvGet('neuron_cap', 8000),
    };
    const questions = await allGeneratedQuestions();
    const bookmarks = await kvGet('bookmarks', []);
    const existing = await readDoc();
    const prevAttempts = existing?.attempts ? JSON.parse(existing.attempts) : [];
    const prevQuestions = existing?.questions ? JSON.parse(existing.questions) : [];
    const mergedAttempts = mergeArrays(prevAttempts, allAttemptsLocal, 'id');
    const mergedQuestions = mergeArrays(prevQuestions, questions, 'id');
    await writeDoc({
      attempts: JSON.stringify(mergedAttempts),
      settings: JSON.stringify(settings),
      questions: JSON.stringify(mergedQuestions),
      bookmarks: JSON.stringify(bookmarks),
      ts: new Date().toISOString(),
    });
    await touchSyncTs();
    return { ok: true, pushed: allAttemptsLocal.length, total: allAttemptsLocal.length };
  } catch (e) {
    return { ok: false, reason: e.message };
  } finally {
    _syncInProgress = false; notify();
  }
}

// ---- Pull ----
export async function pull() {
  if (!_config) return { ok: false, reason: 'not-configured' };
  if (!_deviceId) return { ok: false, reason: 'no-session' };
  if (_syncInProgress) return { ok: false, reason: 'sync-in-progress' };
  _syncInProgress = true; notify();
  try {
    await readAllAndMerge();
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  } finally {
    _syncInProgress = false; notify();
  }
}

export async function autoPull() {
  if (!_deviceId) return;
  await readAllAndMerge();
}

function mergeArrays(a, b, key) {
  const map = new Map();
  for (const item of [...(a || []), ...(b || [])]) {
    if (item && item[key]) map.set(item[key], item);
  }
  return [...map.values()];
}
