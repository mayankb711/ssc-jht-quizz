/*
  progress.js — mastery breakdown by topic & skill, history.
  Surfaces the same data the adaptive engine uses.
  Uses CSS classes from primitives for all styling.
*/

import { summary } from '../core/progress.js';
import { computeMastery } from '../core/engine.js';
import { topicById } from '../data/topics.js';

export async function mount(wrap, params, { topbar, go }) {
  wrap.innerHTML = `${topbar('Progress')}<div id="pbody"><div class="ui-spinner"></div></div>`;
  const body = document.getElementById('pbody');

  const s = await summary();
  const { mastery, topicMastery, skillMastery } = await computeMastery();

  if (!s.total) {
    body.innerHTML = `
      <div class="ui-empty">
        <h3>No attempts yet.</h3>
        <div class="ui-empty__action">
          <button class="ui-btn" onclick="location.hash='screen=quiz&mode=quick'">Start a quick quiz</button>
        </div>
      </div>`;
    return;
  }

  const topicRows = s.topics.map(t => {
    const info = topicById(t.topic) || { label: t.topic };
    const pct = Math.round(t.accuracy * 100);
    const barColor = pct >= 75 ? 'var(--good)' : pct >= 50 ? 'var(--warn)' : 'var(--danger)';
    return `
      <div class="ui-topic-row">
        <div class="ui-topic-row__header">
          <span class="ui-topic-row__label">${esc(info.label)}</span>
          <span class="ui-topic-row__stats">${t.correct}/${t.total} · ${pct}%</span>
        </div>
        <div class="ui-meter"><div class="ui-meter__fill" style="width: ${pct}%; background: ${barColor};"></div></div>
      </div>`;
  }).join('');

  const skills = [...skillMastery.entries()]
    .map(([k, v]) => ({ k, v })).sort((a,b) => a.v - b.v);
  const skillRows = skills.slice(0, 14).map(({k,v}) => {
    const pct = Math.round(v*100);
    return `<div class="ui-list-item"><span style="font-size: 0.85rem;">${esc(k)}</span><span class="ui-muted">${pct}%</span></div>`;
  }).join('');

  const topicEntries = [...topicMastery.entries()]
    .map(([k, v]) => ({ k, v })).sort((a,b) => a.v - b.v);
  const topicSkillRows = topicEntries.slice(0, 10).map(({k,v}) => {
    const info = topicById(k) || { label: k };
    return `<div class="ui-list-item"><span style="font-size: 0.85rem;">${esc(info.label)}</span><span class="ui-muted">${Math.round(v*100)}%</span></div>`;
  }).join('');

  body.innerHTML = `
    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Overall</h2>
      </div>
      <div class="ui-card__body">
        <div class="ui-stat-row" style="margin-bottom: 16px;">
          <div class="ui-stat">
            <div class="ui-stat__value">${s.total}</div>
            <div class="ui-stat__label">Answered</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${Math.round(s.accuracy*100)}%</div>
            <div class="ui-stat__label">Accuracy</div>
            <div class="ui-stat__sub">All attempts</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${s.streakDays}</div>
            <div class="ui-stat__label">Day streak</div>
          </div>
        </div>
        <div class="ui-ring-row">
          <div class="ui-ring ui-ring--glow" style="--p: ${Math.round(s.accuracy*100)};">
            <div class="ui-ring__inner">${Math.round(s.accuracy*100)}%</div>
          </div>
          <p class="ui-muted">This view mirrors the exact weights used by the adaptive picker, so weaknesses stay actionable.</p>
        </div>
      </div>
    </div>

    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Mastery by topic</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted" style="font-size: 0.8rem; margin-bottom: 16px;">Sorted weakest-first — the engine drills these hardest.</p>
        ${topicRows}
      </div>
    </div>

    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Weakest topic skills</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted" style="font-size: 0.8rem; margin-bottom: 16px;">Topic-level mastery that feeds drill selection.</p>
        ${topicSkillRows ? `<div class="ui-list">${topicSkillRows}</div>` : '<p class="ui-muted">More data needed.</p>'}
      </div>
    </div>

    <div class="ui-card">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Finest-grained mastery (topic.skill)</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted" style="font-size: 0.8rem; margin-bottom: 16px;">These are the exact weights the adaptive picker uses.</p>
        ${skillRows ? `<div class="ui-list">${skillRows}</div>` : '<p class="ui-muted">More data needed.</p>'}
      </div>
    </div>`;
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
