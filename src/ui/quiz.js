/* ============================================================
   quiz.js — the question-taking screen. Handles all modes:
     mock   : 200 Q, 2 hr timer, negative marking, no feedback
              until the end.
     quick  : 20 Q, adaptive, immediate feedback + explanation.
     topic  : subject/topic picker → drill.
     mistakes : re-attempt previously-wrong questions.
   State is held in a closure; on finish it navigates to review.
   Refactored to use new UI primitives
   ============================================================ */

import { pick } from '../core/engine.js';
import { startMock, finishMock, MOCK } from '../core/mocktest.js';
import { record } from '../core/progress.js';
import { QUESTIONS } from '../data/questions.js';
import { TOPICS, SUBJECTS, topicsBySubject } from '../data/topics.js';
import { allAttempts } from '../store/local.js';
import { explain, generateQuestions, getGeneratedBank } from '../ai/client.js';
import { quizInitialState, quizReducer } from '../features/quiz/session.js';
import { emit } from '../shared/events.js';

export async function mount(wrap, params, { topbar, go }) {
  const mode = params.get('mode') || 'quick';
  wrap.innerHTML = `${topbar('Quiz', modeLabel(mode))}<div id="qbody"><div class="spinner"></div></div>`;
  const body = document.getElementById('qbody');

  // ---- topic/mistakes need a setup step first ----
  if (mode === 'topic') return setupTopic(body, go);
  if (mode === 'mistakes') return startMistakes(body, go);

  // ---- assemble the question list for the mode ----
  let questions = [];
  let timed = false;
  let deadline = 0;
  if (mode === 'mock') {
    const m = await startMock();
    questions = m.questions; timed = true; deadline = m.deadline;
  } else { // quick
    if (QUESTIONS.length < 20) {
      const hiTopic = TOPICS.find(t => t.subject === 'hi');
      const enTopic = TOPICS.find(t => t.subject === 'en');
      await Promise.all([
        hiTopic ? generateQuestions({
          subject: 'hi',
          topic: hiTopic.id,
          label: hiTopic.label,
          labelHi: hiTopic.labelHi,
          skill: hiTopic.skills?.[0] || 'general',
          difficulty: 3,
        }, 4) : Promise.resolve(),
        enTopic ? generateQuestions({
          subject: 'en',
          topic: enTopic.id,
          label: enTopic.label,
          labelHi: enTopic.labelHi,
          skill: enTopic.skills?.[0] || 'general',
          difficulty: 3,
        }, 4) : Promise.resolve(),
      ]);
    }
    questions = await pick({ n: 20 });
  }

  if (!questions.length) {
    body.innerHTML = `
      <div class="ui-empty">
        <div class="ui-empty__icon">📭</div>
        <h3>No questions available yet.</h3>
        <p>The PYQ question bank is being populated. Try the mock-test sample or check back shortly.</p>
        <div class="ui-empty__action">
          <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Back home</button>
        </div>
      </div>
    `;
    return;
  }
  return runSession(body, { questions, mode, timed, deadline, go });
}

function modeLabel(m) {
  return ({ mock: 'Full Mock Test', quick: 'Quick Quiz', topic: 'Topic Practice', mistakes: 'Review Mistakes' })[m] || 'Quiz';
}

// ---------- TOPIC picker ----------
function setupTopic(body, go) {
  body.innerHTML = `
    <div class="ui-card">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Topic Practice</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted">Pick a subject, then optionally a topic. The adaptive engine weights your weak areas heavier.</p>
        
        <div class="ui-search-bar" style="margin: 16px 0;">
          <span class="ui-search-bar__icon">🔍</span>
          <input type="text" id="topic-search" class="ui-search-bar__input" placeholder="Search topics">
        </div>
        
        <div class="ui-filter-bar" style="margin-bottom: 16px;">
          <select id="tsubj" class="ui-select">
            <option value="">Both subjects</option>
            <option value="hi">${SUBJECTS.hi.label} — ${SUBJECTS.hi.labelHi}</option>
            <option value="en">${SUBJECTS.en.label} — ${SUBJECTS.en.labelHi}</option>
          </select>
        </div>
        
        <div class="ui-field">
          <label class="ui-field__label">Topic (optional)</label>
          <select id="ttopic" class="ui-select"><option value="">Any topic</option></select>
        </div>
        
        <div class="ui-field">
          <label class="ui-field__label">Number of questions</label>
          <select id="tn" class="ui-select"><option>10</option><option selected>20</option><option>30</option></select>
        </div>
        
        <button class="ui-btn" id="tstart">Start</button>
      </div>
    </div>
  `;

  const subjSel = document.getElementById('tsubj');
  const search = document.getElementById('topic-search');
  const topSel = document.getElementById('ttopic');
  function refillTopics() {
    const v = subjSel.value;
    const term = String(search.value || '').toLowerCase().trim();
    const source = v ? topicsBySubject(v) : TOPICS;
    topSel.innerHTML = '<option value="">Any topic</option>' +
      source.filter(t => !term || `${t.label} ${t.labelHi}`.toLowerCase().includes(term))
        .map(t => `<option value="${t.id}">${t.label}</option>`).join('');
  }
  subjSel.addEventListener('change', refillTopics);
  search.addEventListener('input', refillTopics);
  refillTopics();
  document.getElementById('tstart').addEventListener('click', async () => {
    const subject = subjSel.value || undefined;
    const topic = topSel.value || undefined;
    const n = parseInt(document.getElementById('tn').value, 10);
    if (topic) {
      const meta = TOPICS.find(t => t.id === topic);
      const localCount = QUESTIONS.filter(q => q.topic === topic).length;
      if (localCount < n) {
        await generateQuestions({
          subject: meta?.subject || subject || 'en',
          topic,
          label: meta?.label || topic,
          labelHi: meta?.labelHi || meta?.label || topic,
          skill: meta?.skills?.[0] || 'general',
          difficulty: 3,
        }, n - localCount);
      }
    }
    const questions = await pick({ subject, topic, n });
    if (!questions.length) { topSel.insertAdjacentHTML('afterend', '<p class="ui-muted">No questions for this selection yet.</p>'); return; }
    runSession(body, { questions, mode: 'topic', timed: false, deadline: 0, go });
  });
}

// ---------- MISTAKES mode ----------
async function startMistakes(body, go) {
  const attempts = await allAttempts();
  const generated = await getGeneratedBank();
  const bank = [...QUESTIONS, ...generated];
  const wrongIds = [...new Set(attempts.filter(a => !a.correct).map(a => a.question_id))];
  let questions = wrongIds.map(id => bank.find(q => q.id === id)).filter(Boolean);
  // dedupe & cap
  questions = questions.slice(0, 40);
  if (!questions.length) {
    body.innerHTML = `
      <div class="ui-empty">
        <div class="ui-empty__icon">🎉</div>
        <h3>No mistakes to review yet.</h3>
        <div class="ui-empty__action">
          <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Back home</button>
        </div>
      </div>
    `;
    return;
  }
  return runSession(body, { questions, mode: 'mistakes', timed: false, deadline: 0, go });
}

// ---------- main session runner ----------
function runSession(body, { questions, mode, timed, deadline, go }) {
  let state = quizInitialState(questions, mode);
  if (timed) state = quizReducer(state, { type: 'set_timing', timed: true, deadline });
  let timerHandle = null;
  let busy = false;

  function render() {
    const q = state.questions[state.index];
    const immediate = state.mode !== 'mock';
    const now = Date.now();
    let timeLeft = '';
    if (state.timed) {
      const s = Math.max(0, Math.floor((state.deadline - now) / 1000));
      const lo = s < 300;
      timeLeft = `<span class="timer ${lo?'low':''}" style="font-variant-numeric: tabular-nums; font-weight: 600; background: var(--surface-2); padding: 4px 10px; border-radius: 999px; font-size: 0.9rem; ${lo ? 'color: var(--danger);' : ''}">⏱ ${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}</span>`;
    }
    const pct = Math.round(((state.index) / state.questions.length) * 100);

    body.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--text-dim); margin-bottom: 12px;">
        <button class="ui-btn ui-btn--ghost" id="quit" style="padding: 8px 12px;">✕ Exit</button>
        <div style="flex: 1; height: 8px; background: var(--surface-2); border-radius: 999px; margin: 0 12px; overflow: hidden;">
          <div style="display: block; height: 100%; background: linear-gradient(90deg, var(--accent-2), var(--accent)); width: ${pct}%; transition: width 0.25s ease;"></div>
        </div>
        <span class="ui-muted">${state.index+1}/${state.questions.length}</span>
        ${timeLeft}
      </div>
      ${q.passage ? `<div style="background: var(--surface-2); border-left: 3px solid var(--accent-2); padding: 12px 14px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; max-height: 260px; overflow: auto; margin-bottom: 14px; font-size: 0.95rem;" class="hi">${esc(q.passage)}</div>` : ''}
      <div style="font-size: 1.05rem; margin: 8px 0 16px; line-height: 1.55; ${q.lang==='hi'?'font-family: var(--font-hi);':''}">${state.index+1}. ${esc(q.stem)}</div>
      <div style="display: flex; flex-direction: column; gap: 10px;" id="opts">
        ${q.options.map((o, idx) => optHtml(o, idx, q, state.answers[state.index], immediate && state.revealed)).join('')}
      </div>
      <div id="feedback"></div>
      <div class="ui-btn-row" style="margin-top: 16px;">
        ${state.index > 0 ? '<button class="ui-btn ui-btn--secondary" id="prev">← Prev</button>' : ''}
        ${immediate && state.answers[state.index]==null ? '<button class="ui-btn ui-btn--secondary" id="skip">Skip</button>' : ''}
        ${immediate && !state.revealed && state.answers[state.index]!=null ? '<button class="ui-btn" id="check">Check answer</button>' : ''}
        ${state.index < state.questions.length-1
            ? '<button class="ui-btn" id="next">Next →</button>'
            : '<button class="ui-btn" id="finish">Finish ✓</button>'}
      </div>`;

    // option click
    body.querySelectorAll('.opt').forEach(el => {
      el.addEventListener('click', () => {
        if (busy || (immediate && state.revealed)) return;
        const idx = +el.dataset.idx;
        state = quizReducer(state, { type: 'select', answer: idx });
        if (!immediate) {
          body.querySelectorAll('.opt').forEach(o => o.classList.remove('selected'));
          el.classList.add('selected');
        } else {
          render();
        }
      });
    });

    const onCheck = async () => {
      busy = true;
      try {
        state = quizReducer(state, { type: 'reveal' });
        const q = state.questions[state.index];
        await record({ question: q, chosen: state.answers[state.index], mode: state.mode });
        render();
        // pull AI explanation (cache-first, cap-guarded)
        const fb = document.getElementById('feedback');
        if (fb) {
          fb.innerHTML = `<div style="background: var(--surface-2); border-left: 3px solid var(--accent-2); padding: 10px 12px; border-radius: 6px; margin-top: 10px; font-size: 0.92rem;"><b>Explanation:</b> <span class="ui-muted">loading…</span></div>`;
          const { text, source } = await explain(q, state.answers[state.index]);
          const tag = source === 'cache' ? '✓ cached' : source === 'ai' ? '✨ AI' : '📖';
          fb.innerHTML = `<div style="background: var(--surface-2); border-left: 3px solid var(--accent-2); padding: 10px 12px; border-radius: 6px; margin-top: 10px; font-size: 0.92rem;"><b>Explanation ${tag}:</b><br>${esc(text)}</div>
            <details style="margin-top: 8px;"><summary class="ui-muted" style="cursor: pointer;">Still confused? Ask a follow-up (uses neurons)</summary>
            <div style="margin-top: 8px;"><textarea id="doubt" rows="2" class="ui-textarea" placeholder="What part is unclear?"></textarea>
            <button class="ui-btn ui-btn--secondary" id="askfu" style="margin-top: 6px;">Ask</button></div></details>`;
          const ask = document.getElementById('askfu');
          if (ask) ask.addEventListener('click', async () => {
            const d = document.getElementById('doubt').value.trim();
            if (!d) return;
            ask.textContent = '…';
            const { text } = await (await import('../ai/client.js')).followup(q, d);
            document.getElementById('feedback').insertAdjacentHTML('beforeend', `<div style="background: var(--surface-2); border-left: 3px solid var(--accent-2); padding: 10px 12px; border-radius: 6px; margin-top: 8px; font-size: 0.92rem;"><b>You asked:</b> ${esc(d)}<br><b>Answer:</b> ${esc(text)}</div>`);
          });
        }
      } finally {
        busy = false;
      }
    };

    document.getElementById('check')?.addEventListener('click', onCheck);
    document.getElementById('next')?.addEventListener('click', () => { state = quizReducer(state, { type: 'next' }); render(); });
    document.getElementById('prev')?.addEventListener('click', () => { state = quizReducer(state, { type: 'prev' }); render(); });
    document.getElementById('skip')?.addEventListener('click', () => { state = quizReducer(state, { type: 'skip' }); render(); });
    document.getElementById('finish')?.addEventListener('click', finish);
    document.getElementById('quit')?.addEventListener('click', () => {
      if (confirm('Exit this session? Your progress is saved.')) { stopTimer(); go('home'); }
    });
  }

  async function finish() {
    stopTimer();
    state = quizReducer(state, { type: 'finish' });
    const answers = state.answers;
    if (state.mode === 'mock') {
      const result = await finishMock(state.questions, answers);
      sessionStorage.setItem('lastMock', JSON.stringify({ questions: state.questions, answers, result }));
      go('review', { mode: 'mock' });
    } else {
      sessionStorage.setItem('lastSession', JSON.stringify({ questions: state.questions, answers, mode: state.mode }));
      go('review', { mode: state.mode });
    }
  }

  function stopTimer() { if (timerHandle) clearInterval(timerHandle); }
  if (state.timed) {
    timerHandle = setInterval(() => {
      if (Date.now() >= state.deadline) { stopTimer(); finish(); }
      else render();
    }, 1000);
  }

  render();
  return stopTimer;
}

// ---------- helpers ----------
function optHtml(text, idx, q, selected, revealed) {
  let style = '';
  if (selected === idx && !revealed) {
    style = 'border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--surface-2));';
  }
  if (revealed) {
    if (idx === q.answer) {
      style = 'border-color: var(--good); background: color-mix(in srgb, var(--good) 14%, var(--surface-2));';
    } else if (selected === idx) {
      style = 'border-color: var(--danger); background: color-mix(in srgb, var(--danger) 14%, var(--surface-2));';
    }
  }
  return `<div class="opt" data-idx="${idx}" style="display: flex; gap: 12px; align-items: flex-start; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 13px 14px; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease; box-shadow: var(--shadow-soft); ${style}"><span style="flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; ${selected === idx && !revealed ? 'background: var(--accent); color: #07140e; border-color: transparent;' : ''}">${String.fromCharCode(65+idx)}</span><span>${esc(text)}</span></div>`;
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function pad(n) { return String(n).padStart(2, '0'); }
