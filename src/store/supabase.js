/*
  supabase.js — optional cloud sync.
  Reads credentials from settings; if absent, this module becomes
  a no-op and the app runs fully offline against local.js.

  Syncs attempts, settings, and generated questions.
  Tracks last-sync timestamp to only push new data.

  Setup (one-time, in app Settings):
    1. Create a free project at supabase.com
    2. Run supabase/schema.sql in the SQL editor
    3. Paste Project URL + anon key into Settings
*/

import { createClient } from '@supabase/supabase-js';
import { kvGet, kvSet, allAttempts, allGeneratedQuestions, upsertGeneratedQuestion, replaceAttempts } from './local.js';

let _client = null;
let _session = null;
let _syncInProgress = false;
let _lastSyncTs = 0;
let _listeners = [];

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
  };
}

export async function configure() {
  const url = await kvGet('sb_url');
  const key = await kvGet('sb_key');
  if (!url || !key) { _client = null; _session = null; notify(); return false; }
  try {
    _client = createClient(url, key, { auth: { persistSession: true } });
    const { data } = await _client.auth.getSession();
    _session = data.session || null;

    // listen for auth changes
    _client.auth.onAuthStateChange((event, session) => {
      _session = session;
      if (event === 'SIGNED_IN') autoPull().catch(() => {});
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
export function isConfigured() {
  return !!_client;
}

export async function signInMagic(email) {
  if (!_client) throw new Error('Supabase not configured');
  const { error } = await _client.auth.signInWithOtp({ email });
  if (error) throw error;
  return true;
}

export async function getSession() {
  return _session;
}

export async function signOut() {
  if (_client) {
    await _client.auth.signOut();
  }
  _session = null;
  notify();
}

// ---- Sync tracking ----
async function getLastSyncTs() {
  return await kvGet('supabase_last_sync_ts', 0);
}
async function setLastSyncTs(ts) {
  _lastSyncTs = ts;
  await kvSet('supabase_last_sync_ts', ts);
  notify();
}

// ---- Push local data to cloud ----
export async function push() {
  if (!_client) return { ok: false, reason: 'not-configured' };
  const sess = _session || (await getSession());
  if (!sess?.user) return { ok: false, reason: 'no-session' };
  if (_syncInProgress) return { ok: false, reason: 'sync-in-progress' };

  _syncInProgress = true;
  notify();

  try {
    const uid = sess.user.id;
    const lastSync = await getLastSyncTs();
    const now = Date.now();

    // push attempts created after last sync
    const all = await allAttempts();
    const newAttempts = all.filter(a => a.ts > lastSync);
    if (newAttempts.length) {
      const rows = newAttempts.map(a => ({ ...a, user_id: uid }));
      const { error } = await _client.from('attempts').upsert(rows, { onConflict: 'id' });
      if (error) return { ok: false, reason: error.message, pushed: 0, total: newAttempts.length };
    }

    // push settings
    const settings = {
      theme: await kvGet('theme', 'dark'),
      neuron_cap: await kvGet('neuron_cap', 8000),
      user_id: uid,
      updated_at: new Date().toISOString(),
    };
    await _client.from('settings').upsert(settings, { onConflict: 'user_id' });

    // push generated questions
    const questions = await allGeneratedQuestions();
    if (questions.length) {
      const qRows = questions.map(q => ({ ...q, user_id: uid }));
      await _client.from('generated_questions').upsert(qRows, { onConflict: 'id' });
    }

    await setLastSyncTs(now);
    return { ok: true, pushed: newAttempts.length, total: newAttempts.length };
  } catch (e) {
    return { ok: false, reason: e.message };
  } finally {
    _syncInProgress = false;
    notify();
  }
}

// ---- Pull cloud data, merge into local ----
export async function pull() {
  if (!_client) return { ok: false, reason: 'not-configured' };
  const sess = _session || (await getSession());
  if (!sess?.user) return { ok: false, reason: 'no-session' };
  if (_syncInProgress) return { ok: false, reason: 'sync-in-progress' };

  _syncInProgress = true;
  notify();

  try {
    const uid = sess.user.id;
    const now = Date.now();
    let merged = 0;

    // pull attempts
    const { data: cloudAttempts, error: attErr } = await _client
      .from('attempts')
      .select('*')
      .eq('user_id', uid);
    if (attErr) return { ok: false, reason: attErr.message };

    const localAttempts = new Map((await allAttempts()).map(a => [a.id, a]));
    for (const r of (cloudAttempts || [])) {
      const have = localAttempts.get(r.id);
      if (!have || (r.ts || 0) > (have.ts || 0)) {
        localAttempts.set(r.id, r);
        merged++;
      }
    }
    if (merged > 0) {
      await replaceAttempts([...localAttempts.values()]);
    }

    // pull settings
    const { data: cloudSettings } = await _client
      .from('settings')
      .select('*')
      .eq('user_id', uid)
      .single();
    if (cloudSettings) {
      if (cloudSettings.theme) {
        await kvSet('theme', cloudSettings.theme);
        document.documentElement.setAttribute('data-theme', cloudSettings.theme);
      }
      if (cloudSettings.neuron_cap) await kvSet('neuron_cap', cloudSettings.neuron_cap);
    }

    // pull generated questions
    const { data: cloudQuestions } = await _client
      .from('generated_questions')
      .select('*')
      .eq('user_id', uid);
    for (const q of (cloudQuestions || [])) {
      if (q && q.id) {
        await upsertGeneratedQuestion(q);
      }
    }

    await setLastSyncTs(now);
    return { ok: true, pulled: cloudAttempts?.length || 0, merged };
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
  await pull();
}
