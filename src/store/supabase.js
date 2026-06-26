/*
  supabase.js — online-first cloud sync layer.
  Cloud is the primary data source; IndexedDB is the local cache.
  Reads go cloud-first, writes go cloud + cache.
  Degrades gracefully when offline or not configured.
*/

import { createClient } from '@supabase/supabase-js';
import { kvGet, kvSet, allAttempts, allGeneratedQuestions, upsertGeneratedQuestion, replaceAttempts, addAttempt } from './local.js';

let _client = null;
let _session = null;
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
    configured: !!_client,
    signedIn: !!_session?.user,
    user: _session?.user ?? null,
    syncInProgress: _syncInProgress,
    lastSyncTs: _lastSyncTs,
    lastSyncAt: _lastSyncTs ? new Date(_lastSyncTs).toLocaleString() : null,
    online: _online,
  };
}

export function isOnline() {
  return _online;
}

// ---- Setup ----
export async function configure() {
  const url = await kvGet('sb_url');
  const key = await kvGet('sb_key');
  if (!url || !key) { _client = null; _session = null; notify(); return false; }
  try {
    _client = createClient(url, key, {
      auth: {
        persistSession: true,
        flowType: 'pkce',
        autoRefreshToken: true,
      },
    });

    const params = new URLSearchParams(window.location.search);
    const pkceCode = params.get('code');
    if (pkceCode) {
      const { data, error } = await _client.auth.exchangeCodeForSession(pkceCode);
      if (error) {
        console.warn('PKCE code exchange failed:', error);
      } else {
        _session = data.session || null;
      }
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      const { data } = await _client.auth.getSession();
      _session = data.session || null;
    }

    _client.auth.onAuthStateChange((event, session) => {
      _session = session;
      if (event === 'SIGNED_IN') fetchAll().catch(() => {});
      notify();
    });

    notify();
    return true;
  } catch (e) {
    console.warn('Supabase configure failed:', e);
    _client = null;
    _session = null;
    notify();
    return false;
  }
}

// ---- Auth ----
export async function signInMagic(email) {
  if (!_client) throw new Error('Supabase not configured');
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await _client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
  });
  if (error) throw error;
  return true;
}

export async function getSession() {
  return _session;
}

export async function signOut() {
  if (_client) await _client.auth.signOut();
  _session = null;
  notify();
}

// ---- Sync tracking ----
async function touchSyncTs() {
  _lastSyncTs = Date.now();
  await kvSet('supabase_last_sync_ts', _lastSyncTs);
  notify();
}

// ================================================================
//  Online-first data layer
//  Writes: local cache + cloud (fire-and-forget)
//  Reads:  cloud first, local cache fallback
// ================================================================

// ---- Record one attempt ----
/** Saves locally and pushes to cloud immediately. Always works offline. */
export async function recordAttempt(attempt) {
  // always write to local cache
  await addAttempt(attempt);
  // best-effort cloud push
  if (!_client || !_session?.user || !_online) return;
  try {
    await _client.from('attempts').upsert(
      { ...attempt, user_id: _session.user.id },
      { onConflict: 'id' }
    );
    await touchSyncTs();
  } catch {}
}

// ---- Fetch attempts from cloud, merge into local cache ----
/** Cloud is source of truth. Merges into local, returns local list. */
export async function fetchAttempts() {
  if (!_client || !_session?.user || !_online) return;
  try {
    const { data } = await _client.from('attempts').select('*').eq('user_id', _session.user.id);
    if (!data || !data.length) return;
    const local = new Map((await allAttempts()).map(a => [a.id, a]));
    let changed = false;
    for (const r of data) {
      const have = local.get(r.id);
      if (!have || (r.ts || 0) >= (have.ts || 0)) {
        local.set(r.id, r);
        changed = true;
      }
    }
    if (changed) await replaceAttempts([...local.values()]);
    await touchSyncTs();
  } catch {}
}

// ---- Fetch all cloud data (attempts, settings, questions) ----
export async function fetchAll() {
  await fetchAttempts();
  await fetchSettings();
  await fetchGeneratedQuestions();
}

// ---- Fetch settings from cloud ----
async function fetchSettings() {
  if (!_client || !_session?.user || !_online) return;
  try {
    const { data } = await _client
      .from('settings')
      .select('*')
      .eq('user_id', _session.user.id)
      .single();
    if (data) {
      if (data.theme) {
        await kvSet('theme', data.theme);
        document.documentElement.setAttribute('data-theme', data.theme);
      }
      if (data.neuron_cap) await kvSet('neuron_cap', data.neuron_cap);
    }
  } catch {}
}

// ---- Fetch generated questions from cloud ----
async function fetchGeneratedQuestions() {
  if (!_client || !_session?.user || !_online) return;
  try {
    const { data } = await _client
      .from('generated_questions')
      .select('*')
      .eq('user_id', _session.user.id);
    for (const q of (data || [])) {
      if (q && q.id) await upsertGeneratedQuestion(q);
    }
  } catch {}
}

// ---- Push local data to cloud (legacy batch-sync) ----
export async function push() {
  if (!_client) return { ok: false, reason: 'not-configured' };
  const sess = _session || (await getSession());
  if (!sess?.user) return { ok: false, reason: 'no-session' };
  if (_syncInProgress) return { ok: false, reason: 'sync-in-progress' };

  _syncInProgress = true;
  notify();

  try {
    const uid = sess.user.id;
    const lastSync = await kvGet('supabase_last_sync_ts', 0);
    const now = Date.now();

    const all = await allAttempts();
    const newAttempts = all.filter(a => a.ts > lastSync);
    if (newAttempts.length) {
      const rows = newAttempts.map(a => ({ ...a, user_id: uid }));
      const { error } = await _client.from('attempts').upsert(rows, { onConflict: 'id' });
      if (error) return { ok: false, reason: error.message, pushed: 0, total: newAttempts.length };
    }

    const settings = {
      theme: await kvGet('theme', 'dark'),
      neuron_cap: await kvGet('neuron_cap', 8000),
      user_id: uid,
      updated_at: new Date().toISOString(),
    };
    await _client.from('settings').upsert(settings, { onConflict: 'user_id' });

    const questions = await allGeneratedQuestions();
    if (questions.length) {
      const qRows = questions.map(q => ({ ...q, user_id: uid }));
      await _client.from('generated_questions').upsert(qRows, { onConflict: 'id' });
    }

    await touchSyncTs();
    return { ok: true, pushed: newAttempts.length, total: newAttempts.length };
  } catch (e) {
    return { ok: false, reason: e.message };
  } finally {
    _syncInProgress = false;
    notify();
  }
}

// ---- Pull cloud data into local ----
export async function pull() {
  if (!_client) return { ok: false, reason: 'not-configured' };
  const sess = _session || (await getSession());
  if (!sess?.user) return { ok: false, reason: 'no-session' };
  if (_syncInProgress) return { ok: false, reason: 'sync-in-progress' };

  _syncInProgress = true;
  notify();

  try {
    await fetchAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  } finally {
    _syncInProgress = false;
    notify();
  }
}

// ---- Auto-pull on startup ----
export async function autoPull() {
  const sess = _session || (await getSession());
  if (!sess?.user) return;
  await fetchAll();
}
