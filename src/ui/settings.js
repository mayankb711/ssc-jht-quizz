/* Settings screen
   Uses CSS classes from primitives for all styling. */

import { kvGet, kvSet } from '../store/local.js';
import { configure as sbConfigure, isConfigured as sbReady, signInMagic, getSession, push as sbPush, pull as sbPull } from '../store/supabase.js';
import { getUsage } from '../ai/client.js';
import { downloadBackup, importBackupPayload } from '../core/backup.js';
import { APP } from '../config/app.js';

export async function mount(wrap, params, { topbar, go }) {
  wrap.innerHTML = `${topbar('Settings', 'Personalization + data')}<div id="sbody"><div class="ui-spinner"></div></div>`;
  const body = document.getElementById('sbody');

  const theme = await kvGet('theme', APP.defaultTheme);
  const cfAccount = await kvGet('cf_account', '');
  const cfToken   = await kvGet('cf_token', '');
  const cfModel   = await kvGet('cf_model', '@cf/meta/llama-3-8b-instruct');
  const cap       = await kvGet('neuron_cap', APP.defaultNeuronCap);
  const sbUrl     = await kvGet('sb_url', '');
  const sbKey     = await kvGet('sb_key', '');
  const sbReadyNow = sbReady();
  const sess      = sbReadyNow ? await getSession() : null;
  const u         = await getUsage();

  body.innerHTML = `
    <div class="ui-card settings-card">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Appearance</h2>
      </div>
      <div class="ui-card__body">
        <div class="ui-field">
          <label class="ui-field__label">Theme</label>
          <select id="theme" class="ui-select">
            <option value="dark" ${theme==='dark'?'selected':''}>Dark</option>
            <option value="light" ${theme==='light'?'selected':''}>Light</option>
            <option value="amoled" ${theme==='amoled'?'selected':''}>AMOLED</option>
            <option value="eye" ${theme==='eye'?'selected':''}>Eye Comfort</option>
            <option value="contrast" ${theme==='contrast'?'selected':''}>High Contrast</option>
          </select>
        </div>
      </div>
    </div>

    <div class="ui-card settings-card">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">AI Explanations</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted" style="font-size: 0.85rem;">Paste your Cloudflare credentials to enable AI explanations. They're cached forever, so each concept costs only once.</p>
        <div class="ui-field">
          <label class="ui-field__label">Cloudflare Account ID</label>
          <input id="cf_account" class="ui-input" value="${esc(cfAccount)}" placeholder="e.g. abcd1234">
        </div>
        <div class="ui-field">
          <label class="ui-field__label">Cloudflare API Token</label>
          <input id="cf_token" class="ui-input" type="password" value="${esc(cfToken)}" placeholder="Workers AI access token">
        </div>
        <div class="ui-field">
          <label class="ui-field__label">Model</label>
          <select id="cf_model" class="ui-select">
            <option value="@cf/meta/llama-3-8b-instruct" ${cfModel.includes('llama-3-8b')?'selected':''}>llama-3-8b-instruct</option>
            <option value="@cf/qwen/qwen1.5-0.5b-chat" ${cfModel.includes('qwen1.5-0.5b')?'selected':''}>qwen1.5-0.5b</option>
            <option value="@cf/meta/llama-3.1-8b-instruct" ${cfModel.includes('3.1-8b')?'selected':''}>llama-3.1-8b-instruct</option>
          </select>
        </div>
        <div class="ui-field">
          <label class="ui-field__label">Daily neuron cap</label>
          <input id="neuron_cap" class="ui-input" type="number" min="500" max="10000" value="${cap}">
        </div>
        <div class="ui-meter"><div class="ui-meter__fill" style="width: ${Math.min(100,(u.used/u.cap)*100)}%;"></div></div>
        <p class="ui-muted" style="font-size: 0.8rem;">Used ${u.used} / ${u.cap} neurons today.</p>
        <button class="ui-btn" id="save-ai">Save AI settings</button>
      </div>
    </div>

    <div class="ui-card settings-card">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Cloud Sync</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted" style="font-size: 0.85rem;">Syncs your progress across phone and PC.</p>
        <div class="ui-field">
          <label class="ui-field__label">Project URL</label>
          <input id="sb_url" class="ui-input" value="${esc(sbUrl)}" placeholder="https://xxxx.supabase.co">
        </div>
        <div class="ui-field">
          <label class="ui-field__label">Anon public key</label>
          <input id="sb_key" class="ui-input" value="${esc(sbKey)}" placeholder="eyJhbGciOi...">
        </div>
        <button class="ui-btn" id="save-sb">Save and connect</button>
        <div id="sb-status" style="margin-top: 10px;">
          ${sbReadyNow
            ? (sess ? `<p class="ui-muted">Signed in as ${esc(sess.user.email||'user')}</p>
                       <div class="ui-btn-row"><button class="ui-btn ui-btn--secondary" id="sb-push">Push now</button><button class="ui-btn ui-btn--secondary" id="sb-pull">Pull now</button></div>`
                    : `<div class="ui-field" style="margin-top: 10px;"><label class="ui-field__label">Sign in with email</label><input id="sb-email" class="ui-input" placeholder="you@email.com"></div><button class="ui-btn ui-btn--secondary" id="sb-magic">Send magic link</button>`)
            : ''}
        </div>
      </div>
    </div>

    <div class="ui-card">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Backup</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted" style="font-size: 0.85rem;">Export your progress to a file and restore it later on any device.</p>
        <div class="ui-btn-row">
          <button class="ui-btn ui-btn--secondary" id="backup">Export backup (.json)</button>
          <label class="ui-btn ui-btn--secondary" style="display: inline-flex; align-items: center; cursor: pointer;">
            Import backup
            <input id="backup-file" type="file" accept="application/json" style="display: none;">
          </label>
        </div>
        <p class="ui-muted" style="font-size: 0.75rem; margin-top: 8px;">Imports attempts, generated questions, diagnostics history, and settings.</p>
      </div>
    </div>`;

  document.getElementById('theme').addEventListener('change', async (e) => {
    await kvSet('theme', e.target.value);
    document.documentElement.setAttribute('data-theme', e.target.value);
  });
  document.getElementById('save-ai').addEventListener('click', async () => {
    await kvSet('cf_account', document.getElementById('cf_account').value.trim());
    await kvSet('cf_token',   document.getElementById('cf_token').value.trim());
    await kvSet('cf_model',   document.getElementById('cf_model').value);
    await kvSet('neuron_cap', parseInt(document.getElementById('neuron_cap').value,10)||APP.defaultNeuronCap);
    flash('AI settings saved.');
  });
  document.getElementById('save-sb').addEventListener('click', async () => {
    await kvSet('sb_url', document.getElementById('sb_url').value.trim());
    await kvSet('sb_key', document.getElementById('sb_key').value.trim());
    const ok = await sbConfigure();
    flash(ok ? 'Supabase connected. Reload to sign in.' : 'Could not connect. Check URL and key.');
    if (ok) location.reload();
  });
  document.getElementById('sb-magic')?.addEventListener('click', async () => {
    try { await signInMagic(document.getElementById('sb-email').value.trim()); flash('Magic link sent. Check email, then reload.'); }
    catch(e){ flash('Error: '+e.message); }
  });
  document.getElementById('sb-push')?.addEventListener('click', async () => {
    const r = await sbPush(); flash(r.ok?`Pushed ${r.pushed} attempts.`:'Push failed: '+r.reason);
  });
  document.getElementById('sb-pull')?.addEventListener('click', async () => {
    const r = await sbPull(); flash(r.ok?`Pulled ${r.pulled}, merged ${r.merged}.`:'Pull failed: '+r.reason);
  });
  document.getElementById('backup').addEventListener('click', downloadBackup);
  document.getElementById('backup-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = await importBackupPayload(payload);
      if (payload.settings?.theme) document.documentElement.setAttribute('data-theme', payload.settings.theme);
      flash(`Imported backup: ${result.attempts} attempts, ${result.generatedQuestions} generated questions, ${result.errorReports} reports.`);
      location.reload();
    } catch (err) {
      flash(`Import failed: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  });

  function flash(msg) {
    const old = document.getElementById('flash');
    if (old) old.remove();
    body.insertAdjacentHTML('afterbegin', `<div class="ui-toast" id="flash">${esc(msg)}</div>`);
    setTimeout(() => document.getElementById('flash')?.remove(), 3500);
  }
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
