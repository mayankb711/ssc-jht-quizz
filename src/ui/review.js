/* ============================================================
   review.js — post-session review. Shows score breakdown (with
   negative marking for mock), then every question with the user's
   answer vs correct, plus the explanation.
   Refactored to use new UI primitives
   ============================================================ */

import { scoreSession, NEGATIVE } from '../core/progress.js';
import { explain } from '../ai/client.js';

export async function mount(wrap, params, { topbar, go }) {
  wrap.innerHTML = `${topbar('Review', 'Session results')}<div id="rbody"><div class="ui-spinner"></div></div>`;
  const body = document.getElementById('rbody');
  const mode = params.get('mode') || 'quick';
  const isMock = mode === 'mock';

  const raw = isMock ? sessionStorage.getItem('lastMock') : sessionStorage.getItem('lastSession');
  if (!raw) {
    body.innerHTML = `
      <div class="ui-empty">
        <h3>No session to review.</h3>
        <div class="ui-empty__action">
          <button class="ui-btn" onclick="location.hash='screen=home'">Home</button>
        </div>
      </div>
    `;
    return;
  }
  const { questions, answers, result } = JSON.parse(raw);
  const scored = result || scoreSession(
    questions.map((q, i) => ({ correct: answers[i] === q.answer }))
  );

  body.innerHTML = `
    <div class="ui-card" style="margin-bottom: 20px;">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">${isMock ? 'Mock Test Result' : 'Session Result'}</h2>
      </div>
      <div class="ui-card__body">
        <div class="ui-stat-row" style="margin-bottom: 16px;">
          <div class="ui-stat">
            <div class="ui-stat__value" style="color: var(--good)">${scored.correct}</div>
            <div class="ui-stat__label">Correct</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value" style="color: var(--danger)">${scored.wrong}</div>
            <div class="ui-stat__label">Wrong</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${scored.unattempted || 0}</div>
            <div class="ui-stat__label">Skipped</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${(scored.marks ?? 0).toFixed(2)}</div>
            <div class="ui-stat__label">Marks</div>
          </div>
        </div>
        ${isMock ? `<p class="ui-muted ui-center">Real cutoff ~ 45-55%. Aim higher in weak topics (see Progress).</p>` : ''}
        <div class="ui-btn-row" style="margin-top: 12px;">
          <button class="ui-btn" onclick="location.hash='screen=quiz&mode=quick'">Another quiz</button>
          <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Home</button>
        </div>
      </div>
    </div>

    <div class="ui-section-head">
      <h2 class="ui-section-head__title">Question by question</h2>
      <span class="ui-muted">Review every choice and explanation</span>
    </div>
    <div id="qlist"></div>
  `;

  const list = document.getElementById('qlist');
  questions.forEach((q, i) => {
    const chosen = answers[i];
    const correct = chosen === q.answer;
    const div = document.createElement('div');
    div.style.cssText = 'margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid var(--border);';
    div.innerHTML = `
      <div style="margin-bottom: 8px;">
        <span class="ui-badge ui-badge--neutral">${q.topic.replace(/_/g, ' ')}</span>
        ${correct ? '<span class="ui-badge ui-badge--good">✓</span>' : chosen == null ? '<span class="ui-badge ui-badge--neutral">skipped</span>' : '<span class="ui-badge ui-badge--danger">✗</span>'}
      </div>
      <div style="font-size: 1rem; margin: 6px 0; ${q.lang === 'hi' ? 'font-family: var(--font-hi);' : ''}">${i + 1}. ${esc(q.stem)}</div>
      ${q.passage ? `<details><summary class="ui-muted" style="cursor: pointer; font-size: 0.85rem;">Show passage</summary><div style="background: var(--surface-2); border-left: 3px solid var(--accent-2); padding: 12px 14px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; max-height: 260px; overflow: auto; margin-top: 8px; font-size: 0.95rem;" class="hi">${esc(q.passage)}</div></details>` : ''}
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${q.options.map((o, idx) => {
          let style = '';
          if (idx === q.answer) {
            style = 'border-color: var(--good); background: color-mix(in srgb, var(--good) 14%, var(--surface-2));';
          } else if (idx === chosen) {
            style = 'border-color: var(--danger); background: color-mix(in srgb, var(--danger) 14%, var(--surface-2));';
          }
          return `<div style="display: flex; gap: 12px; align-items: flex-start; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 13px 14px; cursor: default; pointer-events: none; ${style}"><span style="flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">${String.fromCharCode(65 + idx)}</span><span>${esc(o)}</span></div>`;
        }).join('')}
      </div>
      <div class="expl-fb" data-i="${i}" style="margin-top: 10px;"><span class="ui-muted">Loading explanation…</span></div>`;
    list.appendChild(div);

    // lazy-load explanation
    explain(q, chosen).then(({ text, source }) => {
      const tag = source === 'cache' ? '✓ cached' : source === 'ai' ? '✨ AI' : '📖';
      body.querySelector(`.expl-fb[data-i="${i}"]`).innerHTML =
        `<div style="background: var(--surface-2); border-left: 3px solid var(--accent-2); padding: 10px 12px; border-radius: 6px; margin-top: 10px; font-size: 0.92rem;"><b>${tag}</b> ${esc(text)}</div>`;
    });
  });
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
