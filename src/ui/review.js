import { scoreSession } from '../core/progress.js';
import { APP } from '../config/app.js';
import { explain } from '../ai/client.js';
import { logError } from '../core/diagnostics.js';
import { knowledgeGraph } from '../learning/graph.js';
import { getMemoryTip } from './quiz.js';

export async function mount(wrap, params, { topbar, go }) {
  const mode = params.get('mode') || 'quick';
  const key = mode === 'mock' ? 'lastMock' : 'lastSession';
  const raw = sessionStorage.getItem(key);
  if (!raw) {
    wrap.innerHTML = `${topbar('Review', '')}<div id="qbody"><div class="ui-empty"><h3>No session data found.</h3><p class="ui-muted">Complete a quiz first.</p></div></div>`;
    return;
  }

  let data;
  try { data = JSON.parse(raw); } catch { wrap.innerHTML = `${topbar('Review', '')}<div id="qbody"><div class="ui-empty"><h3>Invalid session data.</h3></div></div>`; return; }

  const { questions, answers } = data;
  const attempts = questions.map((q, i) => ({
    question: q,
    chosen: answers[i],
    correct: answers[i] === q.answer,
    correctIndex: q.answer,
  }));
  const stats = scoreSession(attempts.map(a => ({ chosen: a.chosen, correct: a.correct })));

  await knowledgeGraph.init();

  wrap.innerHTML = `${topbar('Review', mode === 'mock' ? 'Mock Test' : 'Session')}<div id="qbody"></div>`;
  const body = document.getElementById('qbody');

  body.innerHTML = `
    <div class="ui-card" style="margin-bottom: 16px;">
      <div class="ui-card__body" style="padding: 16px 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="font-size: 1.5rem; font-weight: 750; color: var(--accent);">${stats.marks}</p>
            <p style="font-size: 0.8rem; color: var(--text-dim);">Score (${APP.negativeMarking > 0 ? `-${APP.negativeMarking} per wrong` : 'no negative'})</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 1.1rem;">${stats.correct}<span style="color: var(--text-dim); font-size: 0.85rem;">/${stats.total}</span></p>
            <p style="font-size: 0.8rem; color: var(--text-dim);">${stats.wrong} wrong</p>
          </div>
        </div>
        <div class="ui-progress__bar" style="margin-top: 12px;">
          <span class="ui-progress__bar-fill" style="width: ${(stats.correct / stats.total) * 100}%;"></span>
        </div>
      </div>
    </div>
    <div id="review-list"></div>
    <div style="text-align: center; margin: 16px 0;">
      <button class="ui-btn ui-btn--secondary" id="back-home">← Back to Home</button>
    </div>`;

  const list = document.getElementById('review-list');
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    const q = a.question;
    const isWrong = !a.correct;
    const card = document.createElement('div');
    card.className = 'ui-card';
    card.style.cssText = 'margin-bottom: 10px; border-left: 3px solid ' + (isWrong ? '#e74c3c' : '#27ae60') + ';';
    card.innerHTML = `
      <div class="ui-card__body" style="padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1;">
            <p style="font-size: 0.8rem; margin-bottom: 4px;">${i + 1}. ${esc(q.stem)}</p>
            <p style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 6px;">
              ${isWrong ? `❌ You chose: ${esc(q.options[a.chosen])}` : `✅ ${esc(q.options[q.answer])}`}
              ${isWrong ? ` &nbsp;|&nbsp; Correct: ${esc(q.options[q.answer])}` : ''}
            </p>
          </div>
          <button class="ui-btn ui-btn--ghost" data-toggle="a${i}" style="font-size: 0.75rem; padding: 4px 8px;">
            ${isWrong ? '💡 Teach' : '📖 Explain'}
          </button>
        </div>
        <div id="a${i}" class="review-teach" style="display: none; margin-top: 8px; padding: 10px; background: var(--surface-2); border-radius: 6px;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">Loading...</div>
        </div>
      </div>`;
    list.appendChild(card);

    const toggle = card.querySelector('[data-toggle]');
    const content = card.querySelector('.review-teach');
    let loaded = false;

    toggle.addEventListener('click', async () => {
      const visible = content.style.display !== 'none';
      content.style.display = visible ? 'none' : 'block';
      if (!visible && !loaded) {
        loaded = true;
        content.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted);">Loading...</div>';
        try {
          const { text, source } = await explain(q, a.chosen);
          const tag = source === 'cache' ? '✓' : source === 'ai' ? '✨' : '📖';
          const memoryTip = getMemoryTip(q.skill || q.topic, a.correct);
          const related = knowledgeGraph.getRelatedQuestions(q.id, 3);
          const concepts = knowledgeGraph.getConceptsForQuestion(q.id);
          const rules = knowledgeGraph.getRulesForQuestion(q.id);

          let html = `<div style="font-size: 0.82rem; line-height: 1.5;">`;

          if (isWrong) {
            html += `<p style="margin-bottom: 6px;"><b>🧐 What did you think?</b><br><span class="ui-muted">You selected option ${String.fromCharCode(65 + a.chosen)} — "${esc(q.options[a.chosen])}"</span></p>`;
            html += `<p style="margin-bottom: 6px;"><b>💡 Correct reasoning:</b><br>${esc(text)}</p>`;
            if (q.explain) {
              html += `<p style="margin-bottom: 6px;"><b>📖 Rule:</b><br>${esc(q.explain)}</p>`;
            }
          } else {
            html += `<p style="margin-bottom: 6px;"><b>✅ Why it's correct:</b><br>${esc(text)}</p>`;
          }

          if (memoryTip) {
            html += `<p style="margin-top: 6px; padding: 6px; background: var(--surface); border-radius: 4px;"><b>🧠 Memory tip:</b> ${esc(memoryTip)}</p>`;
          }

          if (rules.length > 0) {
            html += `<p style="margin-top: 6px;"><b>📏 Key rule${rules.length > 1 ? 's' : ''}:</b></p><ul style="margin: 4px 0 0 16px; font-size: 0.78rem;">${rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`;
          }

          if (concepts.length > 0) {
            html += `<p style="margin-top: 6px;"><b>🏷️ Concepts:</b> <span style="font-size: 0.78rem;">${concepts.slice(0, 4).map(c => `<span style="display: inline-block; padding: 1px 6px; background: var(--surface); border-radius: 8px; margin: 1px;">${esc(c)}</span>`).join(' ')}</span></p>`;
          }

          if (related.length > 0) {
            html += `<p style="margin-top: 6px;"><b>📎 Practice more:</b> ${related.slice(0, 2).map(rq => `<button class="ui-err-btn" data-practice="${rq.id}" style="font-size: 0.75rem; margin: 1px;">Q${rq.id} — ${esc(rq.stem.slice(0, 40))}…</button>`).join(' ')}</p>`;
          }

          html += `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--border); font-size: 0.7rem; color: var(--text-dim);">${tag} explanation • <a href="#" class="teach-flag" data-qid="${q.id}" style="color: var(--accent);">🔖 Mark for review</a></div>`;

          html += `</div>`;
          content.innerHTML = html;

          content.querySelectorAll('[data-practice]').forEach(el => {
            el.addEventListener('click', () => {
              sessionStorage.setItem('quickPractice', JSON.stringify({ mode: 'quick', n: 5 }));
              go('quiz', { mode: 'quick' });
            });
          });

          content.querySelector('.teach-flag')?.addEventListener('click', async (e) => {
            e.preventDefault();
            const { kvGet, kvSet } = await import('../store/local.js');
            const bm = await kvGet('bookmarks', []);
            const qid = e.target.dataset.qid;
            if (!bm.includes(qid)) { bm.push(qid); await kvSet('bookmarks', bm); }
            e.target.textContent = '✅ Marked for review';
          });
        } catch (e) {
          logError(e, { file: 'review.js', func: 'toggle explain', action: 'load explanation', source: 'ui' });
          content.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-danger);">Error loading explanation.</div>`;
        }
      }
    });
  }

  document.getElementById('back-home')?.addEventListener('click', () => go('home'));
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
