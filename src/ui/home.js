/* ============================================================
   home.js — landing screen. Pick a mode; see quick stats.
   Refactored to use new UI primitives
   ============================================================ */

import { summary } from '../core/progress.js';
import { getUsage } from '../ai/client.js';

export async function mount(wrap, params, { topbar, go }) {
  wrap.innerHTML = `${topbar('SSC JHT', 'Paper 1 practice')}
    <div id="home-body"><div class="ui-spinner"></div></div>`;

  const s = await summary();
  const u = await getUsage();
  const acc = s.total ? Math.round(s.accuracy * 100) : 0;

  const focus = s.topics.slice(0, 4);
  document.getElementById('home-body').innerHTML = `
    <div class="ui-card" style="margin-bottom: 20px;">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Welcome back</h2>
      </div>
      <div class="ui-card__body">
        <div class="ui-stat-row" style="margin-bottom: 16px;">
          <div class="ui-stat">
            <div class="ui-stat__value">${s.total}</div>
            <div class="ui-stat__label">Answered</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${acc}%</div>
            <div class="ui-stat__label">Accuracy</div>
            <div class="ui-stat__sub">Overall correctness</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${s.streakDays}</div>
            <div class="ui-stat__label">Streak</div>
            <div class="ui-stat__sub">Active days</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${u.used}/${u.cap}</div>
            <div class="ui-stat__label">AI today</div>
            <div class="ui-stat__sub">Neurons used</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 16px; align-items: center;">
          <div class="ui-ring" style="--p: ${Math.min(100, (u.used / u.cap) * 100)};">
            <div class="ui-ring__inner">${Math.round((u.used / u.cap) * 100)}%</div>
          </div>
          <div>
            <p class="ui-muted">Weakest topics appear at top in Progress. The adaptive engine drills those first.</p>
            <div class="ui-btn-row" style="margin-top: 12px;">
              <span class="ui-badge ui-badge--good">Offline-first</span>
              <span class="ui-badge ui-badge--neutral">Adaptive</span>
              <span class="ui-badge ui-badge--neutral">Paper 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="ui-section-head">
      <h2 class="ui-section-head__title">Choose a mode</h2>
      <span class="ui-muted">Start in the format that matches your study goal</span>
    </div>
    <div class="grid">
      <div class="ui-card ui-card--interactive" data-mode="mock">
        <div class="ui-card__body">
          <span class="emoji" style="font-size: 1.6rem;">📝</span>
          <strong>Full Mock Test</strong>
          <p class="ui-muted" style="font-size: 0.82rem; margin: 4px 0 0;">200 Q, 2 hours, negative marking.</p>
        </div>
      </div>
      <div class="ui-card ui-card--interactive" data-mode="quick">
        <div class="ui-card__body">
          <span class="emoji" style="font-size: 1.6rem;">⚡</span>
          <strong>Quick Quiz</strong>
          <p class="ui-muted" style="font-size: 0.82rem; margin: 4px 0 0;">20 adaptive questions across both subjects.</p>
        </div>
      </div>
      <div class="ui-card ui-card--interactive" data-mode="topic">
        <div class="ui-card__body">
          <span class="emoji" style="font-size: 1.6rem;">🎯</span>
          <strong>Topic Practice</strong>
          <p class="ui-muted" style="font-size: 0.82rem; margin: 4px 0 0;">Drill one subject or topic.</p>
        </div>
      </div>
      <div class="ui-card ui-card--interactive" data-mode="mistakes">
        <div class="ui-card__body">
          <span class="emoji" style="font-size: 1.6rem;">🔁</span>
          <strong>Review Mistakes</strong>
          <p class="ui-muted" style="font-size: 0.82rem; margin: 4px 0 0;">Re-attempt questions you got wrong before.</p>
        </div>
      </div>
    </div>

    <div class="ui-card" style="margin-top: 20px;">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Weakest topics to focus</h2>
      </div>
      <div class="ui-card__body">
        ${focus.length ? `
          <div class="ui-list">
            ${focus.map(t => `
              <div class="ui-list-item">
                <span>${t.topic.replace(/_/g, ' ')}</span>
                <span class="ui-muted">${Math.round(t.accuracy * 100)}% · ${t.correct}/${t.total}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="ui-empty">
            <p class="ui-muted">No data yet - take a quiz!</p>
          </div>
        `}
      </div>
    </div>
  `;

  wrap.querySelectorAll('[data-mode]').forEach(el => {
    el.addEventListener('click', () => {
      const m = el.getAttribute('data-mode');
      go('quiz', { mode: m });
    });
  });
}
