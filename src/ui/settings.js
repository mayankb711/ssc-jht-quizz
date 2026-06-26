/* Settings screen
   Enhanced with live Firebase sync status. */

import { kvGet, kvSet } from '../store/local.js';
import {
  configure, signInMagic, signOut, getSession, getStatus,
  push as cloudPush, pull as cloudPull, onAuthChange,
} from '../store/cloud.js';
import { getUsage } from '../ai/client.js';
import { downloadBackup, importBackupPayload } from '../core/backup.js';
import { logError } from '../core/diagnostics.js';
import { APP, KV_KEYS } from '../config/app.js';

export async function mount(wrap, params, { topbar, go }) {
  wrap.innerHTML = `${topbar('Settings', 'Personalization + data')}<div id="sbody"><div class="ui-spinner"></div></div>`;
  const body = document.getElementById('sbody');

  const theme = await kvGet('theme', APP.defaultTheme);
  const cfAccount = await kvGet('cf_account', '');
  const cfToken   = await kvGet('cf_token', '');
  const cfModel   = await kvGet('cf_model', '@cf/meta/llama-3-8b-instruct');
  const cap       = await kvGet('neuron_cap', APP.defaultNeuronCap);
  const fbProject = await kvGet('fb_project_id', '');
  const fbKey     = await kvGet('fb_api_key', '');
  const goal      = await kvGet('daily_goal', 30);
  const u         = await getUsage();
  let cloudStatus = getStatus();

  const unsub = onAuthChange(() => {
    cloudStatus = getStatus();
    renderSyncSection();
  });

  render();

  function withTry(label, fn) {
    return async function () {
      try { return await fn.apply(this, arguments); }
      catch (e) { logError(e, { file: 'settings.js', func: label, source: 'ui', action: label }); flash('Error: ' + (e.message || 'Unknown')); }
    };
  }

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
          <p class="ui-muted ui-text-sm">Syncs your progress across devices via <b>Firebase Firestore</b> (REST API, free tier). Create a project at <b>console.firebase.google.com</b>, enable Firestore, then paste the Web API Key and Project ID below.</p>
          <div class="ui-field">
            <label class="ui-field__label">Project ID</label>
            <input id="fb_project_id" class="ui-input" value="${esc(fbProject)}" placeholder="my-project-abc12">
          </div>
          <div class="ui-field">
            <label class="ui-field__label">Web API Key</label>
            <input id="fb_api_key" class="ui-input" type="password" value="${esc(fbKey)}" placeholder="AIzaSy...">
          </div>
          <button class="ui-btn" id="save-fb">Save and connect</button>
          <div id="fb-status" class="ui-mt-md"></div>
        </div>
      </div>

      <div class="ui-card settings-card">
        <div class="ui-card__header">
          <h2 class="ui-section-head__title">Daily Goal</h2>
        </div>
        <div class="ui-card__body">
          <p class="ui-muted ui-text-sm">Set a daily question-answer target. Your progress shows on the home screen.</p>
          <div class="ui-field">
            <label class="ui-field__label">Questions per day</label>
            <input id="daily_goal" class="ui-input" type="number" min="5" max="500" value="${goal}">
          </div>
          <button class="ui-btn" id="save-goal">Save goal</button>
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
    document.getElementById('theme').addEventListener('change', withTry('theme change', async (e) => {
      await kvSet(KV_KEYS.theme, e.target.value);
      document.documentElement.setAttribute('data-theme', e.target.value);
    }));
    document.getElementById('save-ai').addEventListener('click', withTry('save AI settings', async () => {
      await kvSet(KV_KEYS.cfAccount, document.getElementById('cf_account').value.trim());
      await kvSet(KV_KEYS.cfToken,   document.getElementById('cf_token').value.trim());
      await kvSet(KV_KEYS.cfModel,   document.getElementById('cf_model').value);
      await kvSet(KV_KEYS.neuronCap, parseInt(document.getElementById('neuron_cap').value,10)||APP.defaultNeuronCap);
      flash('AI settings saved.');
    }));
    document.getElementById('save-fb').addEventListener('click', withTry('save Firebase config', async () => {
      await kvSet(KV_KEYS.fbProjectId, document.getElementById('fb_project_id').value.trim());
      await kvSet(KV_KEYS.fbApiKey, document.getElementById('fb_api_key').value.trim());
      const ok = await configure();
      flash(ok ? 'Firebase connected.' : 'Could not connect. Check Project ID and API Key.');
      if (ok) {
        cloudStatus = getStatus();
        renderSyncSection();
      }
    }));
    document.getElementById('save-goal').addEventListener('click', withTry('save goal', async () => {
      const val = parseInt(document.getElementById('daily_goal').value, 10);
      if (val >= 5 && val <= 500) {
        await kvSet(KV_KEYS.dailyGoal, val);
        flash('Daily goal saved.');
      } else {
        flash('Enter a number between 5 and 500.');
      }
    }));
  }

  function renderSyncSection() {
    const el = document.getElementById('fb-status');
    if (!el) return;

    if (!cloudStatus.configured) {
      el.innerHTML = '<p class="ui-text-sm ui-muted">Enter credentials above and click <b>Save and connect</b>.</p>';
      return;
    }

    const onlineBadge = cloudStatus.online ? '<span class="ui-badge ui-badge--info">Online</span>' : '<span class="ui-badge ui-badge--warn">Offline</span>';
    const deviceId = cloudStatus.user?.id || '';
    const providerBadge = '<span class="ui-badge ui-badge--good">Firebase</span>';

    const authHtml = cloudStatus.signedIn ? `
      <div class="ui-card__body ui-sync-status">
        <div class="ui-sync-row">
          ${providerBadge}
          ${onlineBadge}
          <span class="ui-sync-email ui-muted">Device: ${esc(deviceId.slice(0, 20))}...</span>
        </div>
        <div class="ui-sync-row${cloudStatus.syncInProgress ? '' : ' ui-sync-row--last'}">
          <span class="ui-badge ui-badge--neutral">Last sync: ${cloudStatus.lastSyncAt || 'never'}</span>
          ${cloudStatus.syncInProgress ? '<span class="ui-spinner ui-spinner--small" style="margin: 0;"></span>' : ''}
        </div>
        <div class="ui-btn-row${cloudStatus.syncInProgress ? '' : ' ui-mt-sm'}">
          <button class="ui-btn" id="fb-push" ${cloudStatus.syncInProgress ? 'disabled' : ''}>
            ${cloudStatus.syncInProgress ? 'Syncing...' : 'Sync now \u2191'}
          </button>
          <button class="ui-btn ui-btn--secondary" id="fb-pull" ${cloudStatus.syncInProgress ? 'disabled' : ''}>Pull \u2193</button>
          <button class="ui-btn ui-btn--ghost" id="fb-copy-id" title="Copy device ID">Copy ID</button>
        </div>
      </div>` : `
      <div class="ui-card__body ui-sync-status">
        <div class="ui-sync-row">
          ${providerBadge}
          ${onlineBadge}
          <span class="ui-sync-email ui-muted">Firebase configured and ready.</span>
        </div>
      </div>`;

    el.innerHTML = authHtml;

    document.getElementById('fb-push')?.addEventListener('click', withTry('cloud push', async () => {
      const btn = document.getElementById('fb-push');
      if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
      const r = await cloudPush();
      flash(r.ok ? `Pushed ${r.pushed} items.` : 'Push failed: ' + r.reason);
      cloudStatus = getStatus();
      renderSyncSection();
    }));

    document.getElementById('fb-pull')?.addEventListener('click', withTry('cloud pull', async () => {
      const btn = document.getElementById('fb-pull');
      if (btn) { btn.disabled = true; btn.textContent = 'Pulling...'; }
      const r = await cloudPull();
      flash(r.ok ? 'Sync complete.' : 'Pull failed: ' + r.reason);
      cloudStatus = getStatus();
      renderSyncSection();
    }));

    document.getElementById('fb-copy-id')?.addEventListener('click', () => {
      if (deviceId) {
        navigator.clipboard.writeText(deviceId).then(() => flash('Device ID copied.'), () => {});
      }
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
