import { getReports, clearReports, markResolved, appendRecovery } from '../core/diagnostics.js';

export async function mount(wrap, params, { topbar, go }) {
  wrap.innerHTML = `${topbar('Diagnostics', 'Errors + recovery log')}<div id="dbody"><div class="ui-spinner"></div></div>`;
  const body = document.getElementById('dbody');
  const reports = await getReports();

  if (!reports.length) {
    body.innerHTML = `
      <div class="ui-empty">
        <h3>No error reports yet.</h3>
        <p class="ui-muted">When the app catches a runtime failure, it will appear here with recovery steps.</p>
        <div class="ui-empty__action">
          <div class="ui-btn-row">
            <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Home</button>
          </div>
        </div>
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Error report panel</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted" style="font-size: 0.85rem;">This stores the exact runtime failure, where it happened, and how the app recovered.</p>
        <div class="ui-btn-row">
          <button class="ui-btn ui-btn--secondary" id="clear">Clear reports</button>
          <button class="ui-btn ui-btn--secondary" id="home">Home</button>
        </div>
      </div>
    </div>
    <div id="reports" class="ui-gap-top"></div>`;

  document.getElementById('clear').addEventListener('click', async () => {
    if (!confirm('Clear all error reports?')) return;
    await clearReports();
    location.hash = 'screen=diagnostics';
  });
  document.getElementById('home').addEventListener('click', () => { location.hash = 'screen=home'; });

  const root = document.getElementById('reports');
  root.innerHTML = reports.map(report => `
    <div class="ui-card" style="margin-bottom: 12px;">
      <div class="ui-card__body">
        <div class="ui-btn-row" style="margin-bottom: 10px;">
          <span class="ui-badge ui-badge--neutral">${new Date(report.ts).toLocaleTimeString()}</span>
          <span class="ui-badge ui-badge--neutral">${esc(report.screen)}</span>
          <span class="ui-badge ${report.resolved ? 'ui-badge--good' : 'ui-badge--warn'}">${report.resolved ? 'Resolved' : 'Open'}</span>
        </div>
        <h3 style="margin-top: 0;">${esc(report.title)}</h3>
        <p class="ui-muted" style="white-space: pre-wrap;">${esc(report.message || '(no message)')}</p>
        ${report.stack ? `<details class="ui-followup"><summary>Stack trace</summary><pre class="error-stack" style="margin-top: 8px;">${esc(report.stack)}</pre></details>` : ''}
        <div style="margin-top: 12px;">
          <strong>Recovery steps</strong>
          <ol style="margin: 8px 0 0 18px; padding: 0;">
            ${(report.recoverySteps || []).map(step => `<li>${esc(step)}</li>`).join('') || '<li class="ui-muted">None recorded</li>'}
          </ol>
        </div>
        <div class="ui-btn-row" style="margin-top: 12px;">
          <button class="ui-btn ui-btn--secondary" data-resolve="${report.id}">${report.resolved ? 'Mark unresolved' : 'Mark resolved'}</button>
          <button class="ui-btn ui-btn--secondary" data-step="${report.id}">Add recovery step</button>
        </div>
      </div>
    </div>
  `).join('');

  root.querySelectorAll('[data-resolve]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-resolve');
      const report = reports.find(r => r.id === id);
      if (!report) return;
      await markResolved(id, !report.resolved);
      location.hash = 'screen=diagnostics';
    });
  });
  root.querySelectorAll('[data-step]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-step');
      const step = prompt('Add a recovery step:');
      if (!step) return;
      await appendRecovery(id, step);
      location.hash = 'screen=diagnostics';
    });
  });
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
