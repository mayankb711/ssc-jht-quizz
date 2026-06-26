import { summary } from '../core/progress.js';
import { pick } from '../core/engine.js';
import { LearningPlanner } from '../learning/planner.js';
import { AnalyticsEngine } from '../learning/analytics.js';
import { loadProfile, predictScore, getDueReviews, getWeakestSkills } from '../learning/profile.js';
import { generateDailyReport, generateWeeklyReport } from '../learning/coach.js';
import { getLearningDNA } from '../learning/velocity.js';
import { detectPatterns } from '../learning/patterns.js';
import { predictSSCScore, getTodayGoal, computeMentalEnergy } from '../learning/goals.js';
import { logError } from '../core/diagnostics.js';
import { TOPICS } from '../data/topics.js';

let _analytics = null;
let _planner = null;

export async function mount(wrap, params, { topbar, go }) {
  wrap.innerHTML = `${topbar('SSC JHT Quiz', 'Paper 1')}<div id="qbody"><div class="ui-spinner"></div></div>`;
  const body = document.getElementById('qbody');

  try {
    _planner = new LearningPlanner();
    await _planner.init();
    _analytics = new AnalyticsEngine();
    await _analytics.init();

    const daily = await _analytics.getDailyProgress();
    const profile = await loadProfile();
    const dueReviews = getDueReviews(profile);
    const weakest = getWeakestSkills(profile, 3);
    const dna = await getLearningDNA();
    const patterns = await detectPatterns();
    const dailyReport = await generateDailyReport();
    const weeklyReport = await generateWeeklyReport();
    const scorePrediction = await predictSSCScore(profile);
    const todayGoal = getTodayGoal(profile);
    const mentalEnergy = computeMentalEnergy(profile);

    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const themeEmoji = hour < 12 ? '🌅' : '🌙';

    const topicLabels = {};
    TOPICS.forEach(t => { topicLabels[t.id] = t.label; });

    const confCal = profile.confidence || { calibration: { accurate: 0, overconfident: 0, underconfident: 0, total: 0 } };
    const cal = confCal.calibration;
    const calTotal = cal.total || 1;

    body.innerHTML = `
      <div class="ui-card" style="margin-bottom: 16px; background: linear-gradient(135deg, var(--accent)10, var(--accent-2)05); border: 1px solid var(--accent)30;">
        <div class="ui-card__body" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <p style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 4px;">${themeEmoji} ${greeting}</p>
              <p style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 8px;">${todayStr}</p>
              <div style="display: flex; align-items: baseline; gap: 4px;">
                <span style="font-size: 2.2rem; font-weight: 750; color: var(--accent);">${scorePrediction.current != null ? scorePrediction.current : '—'}</span>
                <span style="font-size: 1rem; color: var(--text-dim);">/ 200</span>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-dim);">Predicted SSC JHT Score</p>
              ${scorePrediction.likely != null ? `
                <p style="font-size: 0.7rem; color: var(--text-muted);">Likely: ${scorePrediction.likely} · Potential: ${scorePrediction.potential}</p>
              ` : ''}
            </div>
            <div style="text-align: right;">
              <div class="ui-progress-ring" style="width: 56px; height: 56px;">
                ${progressRingSvg(profile.streak.current / Math.max(profile.streak.longest, 1) * 100)}
                <span class="ui-progress-ring__label" style="font-size: 0.85rem;">${profile.streak.current}</span>
              </div>
              <p style="font-size: 0.7rem; color: var(--text-dim); margin-top: 4px;">day streak</p>
              <p style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">${dna.archetype || 'Learner'}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="ui-card" style="margin-bottom: 16px;">
        <div class="ui-card__body" style="padding: 16px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 2rem;">🎯</span>
                <div>
                  <p style="font-weight: 600;">Today's Goal</p>
                  <p style="font-size: 0.8rem; color: var(--text-dim);">${todayGoal.remaining} of ${todayGoal.target} remaining · est. ${todayGoal.estimatedMinutes} min · Energy: ${todayGoal.energy}</p>
                  ${todayGoal.breakRecommended ? '<p style="font-size:0.75rem;color:#e74c3c;">⚠ Rest recommended</p>' : ''}
                </div>
              </div>
            </div>
            <span style="font-size: 1.5rem; font-weight: 700; color: var(--accent);">${Math.round(daily.total)}<span style="font-size: 0.9rem; color: var(--text-dim);">/${todayGoal.target}</span></span>
          </div>
          <div class="ui-progress__bar" style="margin-top: 10px;">
            <span class="ui-progress__bar-fill" style="width: ${Math.min(100, todayGoal.progress * 100)}%;"></span>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 16px;">
        <button class="ui-btn" id="start-session" style="flex: 2; padding: 14px; font-size: 1rem;">
          🚀 Start Today's Session
        </button>
        <button class="ui-btn ui-btn--secondary" id="quick-quiz" style="flex: 1; padding: 14px;">
          ⚡ Quick
        </button>
      </div>

      ${dueReviews.length > 0 ? `
        <div class="ui-card" style="margin-bottom: 12px; border-left: 3px solid #f39c12;">
          <div class="ui-card__body" style="padding: 12px 16px;">
            <p style="font-size: 0.85rem; font-weight: 600; color: #f39c12;">🔄 ${dueReviews.length} reviews due</p>
            <p style="font-size: 0.75rem; color: var(--text-dim);">${dueReviews.slice(0,3).map(r => `${r.skillId} (${Math.round(r.recallProbability*100)}%)`).join(', ')}${dueReviews.length > 3 ? ' +more' : ''}</p>
          </div>
        </div>
      ` : ''}

      ${weakest.length > 0 ? `
        <div class="ui-card" style="margin-bottom: 12px; border-left: 3px solid #e74c3c;">
          <div class="ui-card__body" style="padding: 12px 16px;">
            <p style="font-size: 0.85rem; font-weight: 600; color: #e74c3c;">📉 Weakest areas</p>
            <ul style="margin: 6px 0 0 16px; font-size: 0.8rem; color: var(--text-dim);">
              ${weakest.map(w => `<li>${w.id} (${Math.round(w.mastery * 100)}% mastery)</li>`).join('')}
            </ul>
          </div>
        </div>
      ` : ''}

      <details class="ui-card" style="margin-bottom: 12px;">
        <summary class="ui-card__header" style="padding: 10px 16px; cursor: pointer;">
          <span style="font-weight: 600; font-size: 0.85rem;">🤖 AI Coach Report</span>
          <span style="color: var(--text-muted); font-size: 0.75rem;">tap to expand</span>
        </summary>
        <div class="ui-card__body" style="padding: 12px 16px 16px; font-size: 0.8rem;">
          ${dailyReport.sections.map(s => `<div style="margin-bottom: 6px;">${s.text}</div>`).join('')}
          ${dailyReport.recommendations.map(r => `<div style="margin-bottom: 4px; padding-left: 8px; border-left: 2px solid var(--accent);">${r.text}</div>`).join('')}
        </div>
      </details>

      <details class="ui-card" style="margin-bottom: 12px;">
        <summary class="ui-card__header" style="padding: 10px 16px; cursor: pointer;">
          <span style="font-weight: 600; font-size: 0.85rem;">📊 Weekly Strategy</span>
          <span style="color: var(--text-muted); font-size: 0.75rem;">tap to expand</span>
        </summary>
        <div class="ui-card__body" style="padding: 12px 16px 16px; font-size: 0.8rem;">
          ${weeklyReport.sections.map(s => `<div style="margin-bottom: 6px;">${s.text}</div>`).join('')}
          ${weeklyReport.recommendations.map(r => `<div style="margin-bottom: 4px; padding-left: 8px; border-left: 2px solid var(--accent);">${r}</div>`).join('')}
        </div>
      </details>

      ${patterns.length > 0 ? `
        <details class="ui-card" style="margin-bottom: 12px;">
          <summary class="ui-card__header" style="padding: 10px 16px; cursor: pointer;">
            <span style="font-weight: 600; font-size: 0.85rem;">🔍 Detected Patterns</span>
            <span style="color: var(--text-muted); font-size: 0.75rem;">${patterns.length} found</span>
          </summary>
          <div class="ui-card__body" style="padding: 12px 16px 16px; font-size: 0.8rem;">
            ${patterns.slice(0, 5).map(p => `<div style="margin-bottom: 8px; padding: 8px; background: var(--surface-2); border-radius: 4px;">
              <div style="font-weight: 600; margin-bottom: 2px;">${p.label}</div>
              <div style="color: var(--text-muted); font-size: 0.75rem;">${p.detail}</div>
            </div>`).join('')}
          </div>
        </details>
      ` : ''}

      ${calTotal > 5 ? `
        <div class="ui-card" style="margin-bottom: 12px;">
          <div class="ui-card__header" style="padding: 10px 16px 0;">
            <h3 class="ui-section-head__title" style="font-size: 0.85rem;">Confidence vs Accuracy</h3>
          </div>
          <div class="ui-card__body" style="padding: 12px 16px 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.75rem; text-align: center;">
              <div style="padding: 8px; background: var(--surface-2); border-radius: 4px;">
                <div style="font-size: 1rem; font-weight: 700; color: #27ae60;">${Math.round(cal.accurate / calTotal * 100)}%</div>
                <div>Accurate</div>
              </div>
              <div style="padding: 8px; background: var(--surface-2); border-radius: 4px;">
                <div style="font-size: 1rem; font-weight: 700; color: #e74c3c;">${Math.round(cal.overconfident / calTotal * 100)}%</div>
                <div>Overconfident ⚠</div>
              </div>
              <div style="padding: 8px; background: var(--surface-2); border-radius: 4px;">
                <div style="font-size: 1rem; font-weight: 700; color: #f39c12;">${Math.round(cal.underconfident / calTotal * 100)}%</div>
                <div>Underconfident</div>
              </div>
              <div style="padding: 8px; background: var(--surface-2); border-radius: 4px;">
                <div style="font-size: 1rem; font-weight: 700; color: var(--accent);">${Math.round(daily.accuracy * 100)}%</div>
                <div>Actual accuracy</div>
              </div>
            </div>
            ${cal.overconfident > cal.accurate ? '<p style="margin-top:6px;font-size:0.7rem;color:#e74c3c;">⚠ You are often confident when wrong — review your thought process</p>' : ''}
          </div>
        </div>
      ` : ''}

      <div class="ui-card" style="margin-bottom: 16px;">
        <div class="ui-card__header" style="padding: 12px 16px 0;">
          <h3 class="ui-section-head__title" style="font-size: 0.9rem;">Practice Modes</h3>
        </div>
        <div class="ui-card__body" style="padding: 12px 16px 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="ui-btn ui-btn--secondary" data-mode="mock" style="padding: 10px; font-size: 0.8rem;">📝 Mock Test</button>
            <button class="ui-btn ui-btn--secondary" data-mode="topic" style="padding: 10px; font-size: 0.8rem;">📚 Topic Practice</button>
            <button class="ui-btn ui-btn--secondary" data-mode="mistakes" style="padding: 10px; font-size: 0.8rem;">🔄 Review Mistakes</button>
            <button class="ui-btn ui-btn--secondary" data-mode="bookmarked" style="padding: 10px; font-size: 0.8rem;">🔖 Bookmarks</button>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="ui-card" style="text-align: center; padding: 12px 8px;">
          <p style="font-size: 1.3rem; font-weight: 700; color: var(--accent);">${daily.accuracy > 0 ? Math.round(daily.accuracy * 100) : 0}%</p>
          <p style="font-size: 0.65rem; color: var(--text-dim);">Today accuracy</p>
        </div>
        <div class="ui-card" style="text-align: center; padding: 12px 8px;">
          <p style="font-size: 1.3rem; font-weight: 700; color: var(--accent-2);">${daily.total}</p>
          <p style="font-size: 0.65rem; color: var(--text-dim);">Questions done</p>
        </div>
        <div class="ui-card" style="text-align: center; padding: 12px 8px;">
          <p style="font-size: 1.3rem; font-weight: 700; color: var(--accent-2);">${dueReviews.length}</p>
          <p style="font-size: 0.65rem; color: var(--text-dim);">Reviews due</p>
        </div>
      </div>
    `;

    document.getElementById('start-session')?.addEventListener('click', () => go('quiz', { mode: 'planned' }));
    document.getElementById('quick-quiz')?.addEventListener('click', () => go('quiz', { mode: 'quick' }));
    body.querySelectorAll('[data-mode]').forEach(el => {
      el.addEventListener('click', () => go('quiz', { mode: el.dataset.mode }));
    });

  } catch (e) {
    logError(e, { file: 'home.js', func: 'mount', action: 'render coach dashboard', source: 'ui', recoverySteps: ['Reload the page', 'Check IndexedDB is available'] });
    body.innerHTML = `
      <div class="ui-card">
        <div class="ui-card__body" style="text-align: center; padding: 40px 20px;">
          <p style="font-size: 2rem;">📚</p>
          <h3>SSC JHT Quiz</h3>
          <p class="ui-muted" style="margin: 8px 0;">Practice for Paper 1 — General Hindi & English</p>
          <div style="display: flex; gap: 8px; justify-content: center; margin-top: 16px; flex-wrap: wrap;">
            <button class="ui-btn" id="start-fallback" style="padding: 12px 24px;">Start Quiz</button>
            <button class="ui-btn ui-btn--secondary" data-mode="mock" style="padding: 12px 24px;">Mock Test</button>
            <button class="ui-btn ui-btn--secondary" data-mode="topic" style="padding: 12px 24px;">Topic Practice</button>
            <button class="ui-btn ui-btn--secondary" data-mode="mistakes" style="padding: 12px 24px;">Mistakes</button>
          </div>
        </div>
      </div>`;
    document.getElementById('start-fallback')?.addEventListener('click', () => go('quiz', { mode: 'quick' }));
    body.querySelectorAll('[data-mode]').forEach(el => {
      el.addEventListener('click', () => go('quiz', { mode: el.dataset.mode }));
    });
  }
}

function progressRingSvg(pct) {
  const r = 24, circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return `<svg class="ui-progress-ring__svg" viewBox="0 0 56 56" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: rotate(-90deg);">
    <circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="3"/>
    <circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" style="transition: stroke-dashoffset 0.3s;"/>
  </svg>`;
}
