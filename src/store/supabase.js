/* ============================================================
   supabase.js — optional cloud sync. Reads credentials from
   settings; if absent, this module becomes a no-op and the app
   runs fully offline against local.js. Sync pushes attempts +
   mastery + settings; pulls on load and merges by timestamp.

   Setup (one-time, in app Settings):
     1. Create a free project at supabase.com
     2. Run supabase/schema.sql in the SQL editor
     3. Paste Project URL + anon key into Settings
   ============================================================ */

import { createClient } from '@supabase/supabase-js';
import { kvGet, kvSet, allAttempts } from './local.js';

let _client = null;

export async function configure() {
  const url = await kvGet('sb_url');
  const key = await kvGet('sb_key');
  if (!url || !key) { _client = null; return false; }
  try {
    _client = createClient(url, key, { auth: { persistSession: true } });
    return true;
  } catch { _client = null; return false; }
}

export function isConfigured() { return !!_client; }

// Magic-link auth (no password). User enters email, clicks link.
export async function signInMagic(email) {
  if (!_client) throw new Error('Supabase not configured');
  const { error } = await _client.auth.signInWithOtp({ email });
  if (error) throw error;
  return true;
}
export async function getSession() {
  if (!_client) return null;
  const { data } = await _client.auth.getSession();
  return data.session;
}
export async function signOut() {
  if (_client) await _client.auth.signOut();
}

// ---- push local attempts to cloud ----
export async function push() {
  if (!_client) return { ok: false, reason: 'not-configured' };
  const sess = await getSession();
  if (!sess) return { ok: false, reason: 'no-session' };
  const uid = sess.user.id;
  const attempts = await allAttempts();
  if (!attempts.length) return { ok: true, pushed: 0 };
  const rows = attempts.map(a => ({ ...a, user_id: uid }));
  const { error } = await _client.from('attempts').upsert(rows, { onConflict: 'id' });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, pushed: rows.length };
}

// ---- pull cloud attempts, merge into local (keep newest) ----
export async function pull() {
  if (!_client) return { ok: false, reason: 'not-configured' };
  const sess = await getSession();
  if (!sess) return { ok: false, reason: 'no-session' };
  const { data, error } = await _client
    .from('attempts')
    .select('*')
    .eq('user_id', sess.user.id);
  if (error) return { ok: false, reason: error.message };

  const local = new Map((await allAttempts()).map(a => [a.id, a]));
  let merged = 0;
  for (const r of (data || [])) {
    const have = local.get(r.id);
    if (!have || (r.ts || 0) > (have.ts || 0)) {
      local.set(r.id, r);
      merged++;
    }
  }
  // persist merged set back
  await kvSet('attempts_full', [...local.values()]);
  return { ok: true, pulled: data?.length || 0, merged };
}
