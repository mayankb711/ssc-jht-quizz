/*
  home.js — landing screen. Pick a mode; see quick stats.
  Uses CSS classes from primitives for all styling.
*/

import { summary } from '../core/progress.js';
import { getUsage } from '../ai/client.js';
import { allAttempts, kvGet } from '../store/local.js';

export async function mount(wrap, params, { topbar, go }) {
  wrap.innerHTML = `${topbar('SSC JHT', 'Paper 1 practice')}
    <div id="home-body"><div class="ui-spinner"></div></div>`;

  const s = await summary();
  const u = await getUsage();
  const acc = s.total ? Math.round(s.accuracy * 100) : 0;
  const focus = s.topics.slice(0, 4);

  document.getElementById('home-body').innerHTML = `
    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Welcome back</h2>
      </div>
      <div class="ui-card__body">
        <div class="ui-stat-row ui-mb-lg">
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
        <div class="ui-ring-row">
          <div class="ui-ring ui-ring--glow" style="--p: ${Math.min(100, (u.used / u.cap) * 100)};">
            <div class="ui-ring__inner">${Math.round((u.used / u.cap) * 100)}%</div>
          </div>
          <div>
            <p class="ui-muted">Weakest topics appear at top in Progress. The adaptive engine drills those first.</p>
            <div class="ui-btn-row ui-mt-md">
              <span class="ui-badge ui-badge--good">Offline-first</span>
              <span class="ui-badge ui-badge--neutral">Adaptive</span>
              <span class="ui-badge ui-badge--neutral">Paper 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>

        <div class="ui-row ui-mb-md" style="display: flex; gap: 12px; flex-wrap: wrap;">
      <div class="ui-card" style="flex: 1; min-width: 140px;">
        <div class="ui-stat">
          <div class="ui-stat__value" id="today-count">-</div>
          <div class="ui-stat__label">Today</div>
          <div class="ui-stat__sub">of goal</div>
        </div>
      </div>
      <div class="ui-card" style="flex: 1; min-width: 140px;">
        <div class="ui-stat">
          <div class="ui-stat__value" id="due-count">-</div>
          <div class="ui-stat__label">Due</div>
          <div class="ui-stat__sub">for review</div>
        </div>
      </div>
      <div class="ui-card" style="flex: 1; min-width: 140px;">
        <div class="ui-stat">
          <div class="ui-stat__value" id="bm-count">-</div>
          <div class="ui-stat__label">Bookmarked</div>
          <div class="ui-stat__sub">questions</div>
        </div>
      </div>
    </div>

    <div class="ui-section-head">
      <h2 class="ui-section-head__title">Choose a mode</h2>
      <span class="ui-muted">Start in the format that matches your study goal</span>
    </div>
    <div class="grid">
      <div class="ui-card ui-card--interactive ui-card--glow mode-card" data-mode="mock">
        <span class="emoji">📝</span>
        <strong>Full Mock Test</strong>
        <span class="desc">200 Q, 2 hours, negative marking.</span>
      </div>
      <div class="ui-card ui-card--interactive ui-card--glow mode-card" data-mode="quick">
              <div class="ui-card ui-card--interactive ui-card--glow mode-card" data-mode="bookmarked">
        <span class="emoji">📌</span>
        <strong>Bookmarked</strong>
        <span class="desc">Review questions you have bookmarked.</span>
      </div>
      <div class="ui-card ui-card--interactive ui-card--glow mode-card" data-mode="mistakes">
        <span class="emoji"></span>
        <strong>Review Mistakes</strong>
        <span class="desc">Re-attempt questions you got wrong before.</span>
      </div>
    </div>

    <div class="ui-card ui-gap-top">
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
            <p class="ui-muted">No data yet — take a quiz!</p>
          </div>
        `}
      </div>
    </div>`;

  // populate daily goal, due count, bookmark count
  ;(async () => {
    const goal = await kvGet('daily_goal', 30);
    const all = await allAttempts();
    const todayStr = new Date().toDateString();
    const todayCount = all.filter(function(a) { return new Date(a.ts).toDateString() === todayStr; }).length;
    document.getElementById('today-count').textContent = todayCount + '/' + goal;
    const due = all.filter(function(a) { return !a.correct; }).length;
    document.getElementById('due-count').textContent = due > 0 ? due : '0';
    const bm = await kvGet('bookmarks', []);
    document.getElementById('bm-count').textContent = bm.length;
  })();

  wrap.querySelectorAll('[data-mode]').forEach(el => {
    el.addEventListener('click', () => {
      const m = el.getAttribute('data-mode');
      go('quiz', { mode: m });
    });
  });
}
