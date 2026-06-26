/*
  quiz.js — the question-taking screen.
  Handles all modes: mock, quick, topic, mistakes.
  Uses CSS classes from primitives for all styling.
*/

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
  wrap.innerHTML = `${topbar('Quiz', modeLabel(mode))}<div id="qbody"><div class="ui-spinner"></div></div>`;
  const body = document.getElementById('qbody');

  if (mode === 'topic') return setupTopic(body, go);
  if (mode === 'mistakes') return startMistakes(body, go);

  let questions = [];
  let timed = false;
  let deadline = 0;
  if (mode === 'mock') {
    const m = await startMock();
    questions = m.questions; timed = true; deadline = m.deadline;
  } else {
    if (QUESTIONS.length < 20) {
      const hiTopic = TOPICS.find(t => t.subject === 'hi');
      const enTopic = TOPICS.find(t => t.subject === 'en');
      await Promise.all([
        hiTopic ? generateQuestions({
          subject: 'hi', topic: hiTopic.id, label: hiTopic.label,
          labelHi: hiTopic.labelHi, skill: hiTopic.skills?.[0] || 'general', difficulty: 3,
        }, 4) : Promise.resolve(),
        enTopic ? generateQuestions({
          subject: 'en', topic: enTopic.id, label: enTopic.label,
          labelHi: enTopic.labelHi, skill: enTopic.skills?.[0] || 'general', difficulty: 3,
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
      </div>`;
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
    </div>`;

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
          subject: meta?.subject || subject || 'en', topic,
          label: meta?.label || topic, labelHi: meta?.labelHi || meta?.label || topic,
          skill: meta?.skills?.[0] || 'general', difficulty: 3,
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
  questions = questions.slice(0, 40);
  if (!questions.length) {
    body.innerHTML = `
      <div class="ui-empty">
        <div class="ui-empty__icon">🎉</div>
        <h3>No mistakes to review yet.</h3>
        <div class="ui-empty__action">
          <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Back home</button>
        </div>
      </div>`;
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
      timeLeft = `<span class="ui-timer${lo ? ' ui-timer--low' : ''}">⏱ ${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}</span>`;
    }
    const pct = Math.round(((state.index) / state.questions.length) * 100);

    body.innerHTML = `
      <div class="ui-progress">
        <button class="ui-btn ui-btn--ghost quiz-exit" id="quit">✕ Exit</button>
        <div class="ui-progress__bar">
          <span class="ui-progress__bar-fill" style="width: ${pct}%;"></span>
        </div>
        <span class="ui-progress__count">${state.index+1}/${state.questions.length}</span>
        ${timeLeft}
      </div>
      ${q.passage ? `<div class="ui-passage hi">${esc(q.passage)}</div>` : ''}
      <div class="ui-stem${q.lang==='hi' ? ' hi' : ''}">${state.index+1}. ${esc(q.stem)}</div>
      <div class="q-options" id="opts">
        ${q.options.map((o, idx) => optHtml(o, idx, q, state.answers[state.index], immediate && state.revealed)).join('')}
      </div>
      <div id="feedback"></div>
      <div class="ui-btn-row ui-mt-lg">
        ${state.index > 0 ? '<button class="ui-btn ui-btn--secondary" id="prev">← Prev</button>' : ''}
        ${immediate && state.answers[state.index]==null ? '<button class="ui-btn ui-btn--secondary" id="skip">Skip</button>' : ''}
        ${immediate && !state.revealed && state.answers[state.index]!=null ? '<button class="ui-btn" id="check">Check answer</button>' : ''}
        ${state.index < state.questions.length-1
            ? '<button class="ui-btn" id="next">Next →</button>'
            : '<button class="ui-btn" id="finish">Finish ✓</button>'}
      </div>`;

    body.querySelectorAll('.ui-opt').forEach(el => {
      el.addEventListener('click', () => {
        if (busy || (immediate && state.revealed)) return;
        const idx = +el.dataset.idx;
        state = quizReducer(state, { type: 'select', answer: idx });
        if (!immediate) {
          body.querySelectorAll('.ui-opt').forEach(o => o.classList.remove('ui-opt--selected'));
          el.classList.add('ui-opt--selected');
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
        const fb = document.getElementById('feedback');
        if (fb) {
          fb.innerHTML = `<div class="ui-feedback"><span class="ui-feedback__tag">Explanation:</span> <span class="ui-muted">loading…</span></div>`;
          const { text, source } = await explain(q, state.answers[state.index]);
          const tag = source === 'cache' ? '✓ cached' : source === 'ai' ? '✨ AI' : '📖';
          fb.innerHTML = `<div class="ui-feedback"><span class="ui-feedback__tag">Explanation ${tag}:</span><br>${esc(text)}</div>
            <details class="ui-followup"><summary>Still confused? Ask a follow-up (uses neurons)</summary>
            <div class="ui-followup-body"><textarea id="doubt" rows="2" class="ui-textarea" placeholder="What part is unclear?"></textarea>
            <button class="ui-btn ui-btn--secondary" id="askfu">Ask</button></div></details>`;
          const ask = document.getElementById('askfu');
          if (ask) ask.addEventListener('click', async () => {
            const d = document.getElementById('doubt').value.trim();
            if (!d) return;
            ask.textContent = '…';
            const { text } = await (await import('../ai/client.js')).followup(q, d);
            document.getElementById('feedback').insertAdjacentHTML('beforeend', `<div class="ui-feedback" style="margin-top: 8px;"><span class="ui-feedback__tag">You asked:</span> ${esc(d)}<br><b>Answer:</b> ${esc(text)}</div>`);
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
  const classes = ['ui-opt'];
  if (selected === idx && !revealed) classes.push('ui-opt--selected');
  if (revealed) {
    if (idx === q.answer) classes.push('ui-opt--correct');
    else if (selected === idx) classes.push('ui-opt--wrong');
  }
  if (revealed) classes.push('ui-opt--disabled');
  return `<div class="${classes.join(' ')}" data-idx="${idx}"><span class="ui-opt__letter">${String.fromCharCode(65+idx)}</span><span class="ui-opt__text">${esc(text)}</span></div>`;
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function pad(n) { return String(n).padStart(2, '0'); }
