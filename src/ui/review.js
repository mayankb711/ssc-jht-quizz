/*
  review.js — post-session review.
  Shows score breakdown with negative marking for mock,
  then every question with the user's answer vs correct.
  Uses CSS classes from primitives for all styling.
*/

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
      </div>`;
    return;
  }
  const { questions, answers, result } = JSON.parse(raw);
  const scored = result || scoreSession(
    questions.map((q, i) => ({ correct: answers[i] === q.answer }))
  );

  body.innerHTML = `
    <div class="ui-card ui-gap-bottom">
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
        ${isMock ? '<p class="ui-muted ui-center">Real cutoff ~ 45-55%. Aim higher in weak topics (see Progress).</p>' : ''}
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
    <div id="qlist"></div>`;

  const list = document.getElementById('qlist');
  questions.forEach((q, i) => {
    const chosen = answers[i];
    const correct = chosen === q.answer;
    const div = document.createElement('div');
    div.className = 'ui-review-item';
    div.innerHTML = `
      <div class="review-badge-row">
        <span class="ui-tag">${q.topic.replace(/_/g, ' ')}</span>
        ${correct ? '<span class="ui-badge ui-badge--good">✓ Correct</span>' : chosen == null ? '<span class="ui-badge ui-badge--neutral">Skipped</span>' : '<span class="ui-badge ui-badge--danger">✗ Wrong</span>'}
      </div>
      <div class="review-stem${q.lang === 'hi' ? ' hi' : ''}">${i + 1}. ${esc(q.stem)}</div>
      ${q.passage ? `<details class="ui-followup"><summary>Show passage</summary><div class="ui-passage" style="margin-top: 8px;">${esc(q.passage)}</div></details>` : ''}
      <div class="review-options">
        ${q.options.map((o, idx) => {
          const optClasses = ['ui-opt', 'ui-opt--disabled'];
          if (idx === q.answer) optClasses.push('ui-opt--correct');
          else if (idx === chosen) optClasses.push('ui-opt--wrong');
          return `<div class="${optClasses.join(' ')}"><span class="ui-opt__letter">${String.fromCharCode(65 + idx)}</span><span class="ui-opt__text">${esc(o)}</span></div>`;
        }).join('')}
      </div>
      <div class="expl-fb" data-i="${i}" style="margin-top: 12px;"><span class="ui-muted">Loading explanation…</span></div>`;
    list.appendChild(div);

    explain(q, chosen).then(({ text, source }) => {
      const tag = source === 'cache' ? '✓ cached' : source === 'ai' ? '✨ AI' : '📖';
      body.querySelector(`.expl-fb[data-i="${i}"]`).innerHTML =
        `<div class="ui-feedback"><span class="ui-feedback__tag">${tag}</span> ${esc(text)}</div>`;
    });
  });
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
