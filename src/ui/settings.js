/* Settings screen
   Enhanced with live Supabase sync status. */

import { kvGet, kvSet } from '../store/local.js';
import {
  configure as sbConfigure,
  signInMagic, signOut, getSession, getStatus,
  push as sbPush, pull as sbPull, onAuthChange,
} from '../store/supabase.js';
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
  const u         = await getUsage();
  let sbStatus    = getStatus();

  const unsub = onAuthChange(() => {
    sbStatus = getStatus();
    renderSyncSection();
  });

  render();

  function render() {
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
          <p class="ui-muted ui-text-sm">Paste your Cloudflare credentials to enable AI explanations. They're cached forever, so each concept costs only once.</p>
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
          <p class="ui-muted ui-text-xs">Used ${u.used} / ${u.cap} neurons today.</p>
          <button class="ui-btn" id="save-ai">Save AI settings</button>
        </div>
      </div>

      <div class="ui-card settings-card">
        <div class="ui-card__header">
          <h2 class="ui-section-head__title">Cloud Sync</h2>
        </div>
        <div class="ui-card__body">
          <p class="ui-muted ui-text-sm">Syncs your progress across devices. Create a free project at <b>supabase.com</b>, run the schema from <b>supabase/schema.sql</b>, then paste credentials below.</p>
          <div class="ui-field">
            <label class="ui-field__label">Project URL</label>
            <input id="sb_url" class="ui-input" value="${esc(sbUrl)}" placeholder="https://xxxx.supabase.co">
          </div>
          <div class="ui-field">
            <label class="ui-field__label">Anon public key</label>
            <input id="sb_key" class="ui-input" value="${esc(sbKey)}" placeholder="eyJhbGciOi...">
          </div>
          <button class="ui-btn" id="save-sb">Save and connect</button>
          <div id="sb-status" class="ui-mt-md"></div>
        </div>
      </div>

      <div class="ui-card">
        <div class="ui-card__header">
          <h2 class="ui-section-head__title">Backup</h2>
        </div>
        <div class="ui-card__body">
          <p class="ui-muted ui-text-sm">Export your progress to a file and restore it later on any device.</p>
          <div class="ui-btn-row">
            <button class="ui-btn ui-btn--secondary" id="backup">Export backup (.json)</button>
            <label class="ui-btn ui-btn--secondary" style="cursor: pointer;">
              Import backup
              <input id="backup-file" type="file" accept="application/json" hidden>
            </label>
          </div>
          <p class="ui-muted ui-mt-sm" style="font-size: 0.75rem;">Imports attempts, generated questions, diagnostics history, and settings.</p>
        </div>
      </div>`;

    renderSyncSection();

    // Event listeners
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
      flash(ok ? 'Supabase connected.' : 'Could not connect. Check URL and key.');
      if (ok) {
        sbStatus = getStatus();
        renderSyncSection();
      }
    });
  }

  function renderSyncSection() {
    const el = document.getElementById('sb-status');
    if (!el) return;

    if (!sbStatus.configured) {
      el.innerHTML = '<p class="ui-text-sm ui-muted">Enter credentials above and click <b>Save and connect</b>.</p>';
      return;
    }

    const onlineBadge = sbStatus.online ? '<span class="ui-badge ui-badge--info">Online</span>' : '<span class="ui-badge ui-badge--warn">Offline</span>';

    const authHtml = sbStatus.signedIn ? `
      <div class="ui-card__body ui-sync-status">
        <div class="ui-sync-row">
          <span class="ui-badge ui-badge--good">Signed in</span>
          ${onlineBadge}
          <span class="ui-sync-email ui-muted">${esc(sbStatus.user?.email || 'Connected')}</span>
        </div>
        <div class="ui-sync-row${sbStatus.syncInProgress ? '' : ' ui-sync-row--last'}">
          <span class="ui-badge ui-badge--neutral">Last sync: ${sbStatus.lastSyncAt || 'never'}</span>
          ${sbStatus.syncInProgress ? '<span class="ui-spinner ui-spinner--small" style="margin: 0;"></span>' : ''}
        </div>
        <div class="ui-btn-row${sbStatus.syncInProgress ? '' : ' ui-mt-sm'}">
          <button class="ui-btn" id="sb-push" ${sbStatus.syncInProgress ? 'disabled' : ''}>
            ${sbStatus.syncInProgress ? 'Syncing…' : 'Sync now ↑'}
          </button>
          <button class="ui-btn ui-btn--secondary" id="sb-pull" ${sbStatus.syncInProgress ? 'disabled' : ''}>Pull ↓</button>
          <button class="ui-btn ui-btn--ghost" id="sb-signout">Sign out</button>
        </div>
      </div>` : `
      <div class="ui-card__body ui-sync-status">
        <div class="ui-sync-row">
          ${onlineBadge}
          <span class="ui-sync-email ui-muted">Connected. Sign in to sync.</span>
        </div>
        <div class="ui-field">
          <label class="ui-field__label">Email</label>
          <input id="sb-email" class="ui-input" placeholder="you@email.com">
        </div>
        <button class="ui-btn" id="sb-magic">Send magic link</button>
      </div>`;

    el.innerHTML = authHtml;

    document.getElementById('sb-magic')?.addEventListener('click', async () => {
      try {
        await signInMagic(document.getElementById('sb-email').value.trim());
        flash('Magic link sent. Check email, then reload.');
      } catch (e) {
        flash('Error: ' + e.message);
      }
    });

    document.getElementById('sb-push')?.addEventListener('click', async () => {
      const btn = document.getElementById('sb-push');
      btn.disabled = true;
      btn.textContent = 'Syncing…';
      const r = await sbPush();
      flash(r.ok ? `Pushed ${r.pushed} items.` : 'Push failed: ' + r.reason);
      sbStatus = getStatus();
      renderSyncSection();
    });

    document.getElementById('sb-pull')?.addEventListener('click', async () => {
      const btn = document.getElementById('sb-pull');
      btn.disabled = true;
      btn.textContent = 'Pulling…';
      const r = await sbPull();
      flash(r.ok ? `Pulled ${r.pulled}, merged ${r.merged}.` : 'Pull failed: ' + r.reason);
      sbStatus = getStatus();
      renderSyncSection();
    });

    document.getElementById('sb-signout')?.addEventListener('click', async () => {
      if (!confirm('Sign out of cloud sync?')) return;
      await signOut();
      sbStatus = getStatus();
      renderSyncSection();
      flash('Signed out.');
    });
  }

  // Bind backup listeners (static, bind once)
  document.getElementById('backup')?.addEventListener('click', downloadBackup);
  document.getElementById('backup-file')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = await importBackupPayload(payload);
      if (payload.settings?.theme) document.documentElement.setAttribute('data-theme', payload.settings.theme);
      flash(`Imported: ${result.attempts} attempts, ${result.generatedQuestions} gen. questions, ${result.errorReports} reports.`);
      location.reload();
    } catch (err) {
      flash(`Import failed: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  });

  return unsub;

  function flash(msg) {
    const old = document.getElementById('flash');
    if (old) old.remove();
    body.insertAdjacentHTML('afterbegin', `<div class="ui-toast" id="flash">${esc(msg)}</div>`);
    setTimeout(() => document.getElementById('flash')?.remove(), 3500);
  }
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
