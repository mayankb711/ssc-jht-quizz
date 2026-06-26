import { pick, getPlanner, getComposer } from '../core/engine.js';
import { startMock, finishMock, MOCK } from '../core/mocktest.js';
import { record } from '../core/progress.js';
import { QUESTIONS } from '../data/questions.js';
import { TOPICS, SUBJECTS, topicsBySubject } from '../data/topics.js';
import { allAttempts, kvGet, kvSet } from '../store/local.js';
import { explain, generateQuestions, getGeneratedBank } from '../ai/client.js';
import { quizInitialState, quizReducer } from '../features/quiz/session.js';
import { emit, DomainEvents } from '../shared/events.js';
import { logError } from '../core/diagnostics.js';
import { LearningPlanner } from '../learning/planner.js';
import { SessionComposer } from '../learning/composer.js';
import { knowledgeGraph } from '../learning/graph.js';
import { learningState, LEARNING_STATES } from '../learning/state.js';

export async function mount(wrap, params, { topbar, go }) {
  const mode = params.get('mode') || 'quick';
  wrap.innerHTML = `${topbar('Quiz', modeLabel(mode))}<div id="qbody"><div class="ui-spinner"></div></div>`;
  const body = document.getElementById('qbody');

  if (mode === 'topic') return setupTopic(body, go);
  if (mode === 'mistakes') return startMistakes(body, go);
  if (mode === 'bookmarked') return startBookmarked(body, go);

  let questions = [];
  let timed = false;
  let deadline = 0;
  if (mode === 'mock') {
    const m = await startMock();
    questions = m.questions; timed = true; deadline = m.deadline;
  } else if (mode === 'planned') {
    await learningState.transition(LEARNING_STATES.PLANNING);
    const plan = await getPlanner()?.createPlan();
    if (plan) {
      await learningState.transition(LEARNING_STATES.PREPARING);
      const session = await getComposer()?.buildSession(plan);
      questions = session?.questions || await pick({ n: 20 });
      await learningState.transition(LEARNING_STATES.WARMUP);
    } else {
      questions = await pick({ n: 20 });
    }
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
  return ({ mock: 'Full Mock Test', quick: 'Quick Quiz', topic: 'Topic Practice', mistakes: 'Review Mistakes', bookmarked: 'Review Bookmarks', planned: 'Today\'s Session' })[m] || 'Quiz';
}

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

async function startBookmarked(body, go) {
  const bm = await kvGet('bookmarks', []);
  if (!bm.length) {
    body.innerHTML = `
      <div class="ui-empty">
        <div class="ui-empty__icon">📍</div>
        <h3>No bookmarked questions yet.</h3>
        <p class="ui-muted">Tap the bookmark icon on any question to save it here.</p>
        <div class="ui-empty__action">
          <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Back home</button>
        </div>
      </div>`;
    return;
  }
  const generated = await getGeneratedBank();
  const bank = [...QUESTIONS, ...generated];
  let questions = bm.map(function(id) { return bank.find(function(q) { return q.id === id; }); }).filter(Boolean);
  if (!questions.length) {
    body.innerHTML = '<div class="ui-empty"><h3>Bookmarked questions not found in question bank.</h3></div>';
    return;
  }
  return runSession(body, { questions: questions, mode: 'bookmarked', timed: false, deadline: 0, go: go });
}

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

function difficultyLabel(d) {
  return ['Easy', 'Fair', 'Moderate', 'Hard', 'Very Hard'][d - 1] || 'Unknown';
}

function renderProgressRing(pct) {
  const r = 18, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return `<svg class="ui-progress-ring__svg" viewBox="0 0 48 48">
    <circle class="ui-progress-ring__bg" cx="24" cy="24" r="${r}"/>
    <circle class="ui-progress-ring__fill" cx="24" cy="24" r="${r}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
  </svg>
  <span class="ui-progress-ring__label">${Math.round(pct)}%</span>`;
}

function confidenceHtml(onSelect) {
  const levels = [
    { emoji: '😖', label: 'No idea' },
    { emoji: '🤔', label: 'Unsure' },
    { emoji: '😐', label: 'Maybe' },
    { emoji: '🙂', label: 'Pretty sure' },
    { emoji: '😎', label: 'Certain' },
  ];
  return `<div class="ui-confidence">
    <div class="ui-confidence__label">How confident are you?</div>
    <div class="ui-confidence__btns">
      ${levels.map((l, i) =>
        `<button class="ui-conf-btn" data-conf="${i + 1}"><span class="ui-conf-btn__emoji">${l.emoji}</span>${l.label}</button>`
      ).join('')}
    </div>
  </div>`;
}

function errorClassificationHtml() {
  const types = ['Didn\'t know', 'Misread', 'Confused options', 'Careless', 'Timed out'];
  return `<div class="ui-error-classify">
    <div class="ui-confidence__label">What went wrong?</div>
    <div class="ui-error-classify__btns">
      ${types.map(t =>
        `<button class="ui-err-btn" data-err="${t}">${t}</button>`
      ).join('')}
    </div>
  </div>`;
}

function runSession(body, { questions, mode, timed, deadline, go }) {
  let state = quizInitialState(questions, mode);
  let _bookmarks = [];
  kvGet('bookmarks', []).then(function(bm) { _bookmarks = bm; render(); }).catch(function(e) { logError(e, { file: 'quiz.js', func: 'runSession', action: 'load bookmarks', source: 'ui', recoverySteps: ['Bookmark state may be incorrect', 'Reload to retry'] }); render(); });
  if (timed) state = quizReducer(state, { type: 'set_timing', timed: true, deadline });
  let timerHandle = null;
  let busy = false;
  let _confidence = null;
  let _errorType = null;
  let _responseTimer = null;
  let _responseStart = null;
  let _notes = {};
  let _relatedQuestions = [];
  let _memoryTips = [];

  function getNote(qid) { return _notes[qid] || ''; }
  function saveNote(qid, text) { _notes[qid] = text; }

  function startResponseTimer() {
    _responseStart = Date.now();
  }

  function stopResponseTimer() {
    if (_responseStart) {
      _responseTimer = Date.now() - _responseStart;
      _responseStart = null;
    }
  }

  function handleKeyboard(e) {
    if (busy) return;
    const key = e.key;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const num = parseInt(key, 10);
    if (num >= 1 && num <= 4) {
      e.preventDefault();
      const opts = body.querySelectorAll('.ui-opt');
      if (opts[num - 1]) opts[num - 1].click();
      return;
    }

    if (key === ' ' || key === 'Space') {
      e.preventDefault();
      const check = document.getElementById('check');
      if (check) { check.click(); return; }
      const next = document.getElementById('next');
      if (next) { next.click(); return; }
      const finish = document.getElementById('finish');
      if (finish) finish.click();
      return;
    }

    if (key === 'b' || key === 'B') {
      e.preventDefault();
      document.getElementById('bm-toggle')?.click();
      return;
    }

    if (key === 'r' || key === 'R') {
      e.preventDefault();
      if (!state.revealed) {
        document.getElementById('check')?.click();
      }
      return;
    }
  }

  function attachKeyboard() {
    document.addEventListener('keydown', handleKeyboard);
  }

  function detachKeyboard() {
    document.removeEventListener('keydown', handleKeyboard);
  }

  function render() {
    const q = state.questions[state.index];
    const immediate = state.mode !== 'mock';
    const bookmarked = _bookmarks.includes(q?.id);
    const now = Date.now();
    let timeLeft = '';
    if (state.timed) {
      const s = Math.max(0, Math.floor((state.deadline - now) / 1000));
      const lo = s < 300;
      timeLeft = `<span class="ui-timer${lo ? ' ui-timer--low' : ''}">⏱ ${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}</span>`;
    }
    const pct = state.questions.length > 0 ? Math.round((state.index / state.questions.length) * 100) : 0;
    const diff = q?.difficulty || 3;
    const isRevealed = immediate && state.revealed;

    body.innerHTML = `
      <div class="ui-progress">
        <button class="ui-btn ui-btn--ghost quiz-exit" id="quit">✕ Exit</button>
        <div class="ui-progress__bar" style="flex:1;">
          <span class="ui-progress__bar-fill" style="width: ${pct}%;"></span>
        </div>
        <div class="ui-progress-ring">${renderProgressRing(pct)}</div>
        <span class="ui-progress__count">${state.index+1}/${state.questions.length}</span>
        ${timeLeft}
      </div>
      ${q.passage ? `<div class="ui-passage hi">${esc(q.passage)}</div>` : ''}
      <div class="ui-stem-row">
        <div class="ui-stem${q.lang==='hi' ? ' hi' : ''}">${state.index+1}. ${esc(q.stem)}</div>
        <span class="ui-diff-badge ui-diff-badge--${diff}">${difficultyLabel(diff)}</span>
        <button class="ui-btn ui-btn--ghost" id="notes-toggle" title="Add note" style="font-size: 0.85rem;">📝</button>
        <button class="ui-btn ui-bookmark-btn" id="bm-toggle" title="Bookmark this question">${bookmarked ? "🔖" : "📌"}</button>
      </div>
      <div id="notes-area" style="display: none; margin-bottom: 8px;">
        <textarea class="ui-textarea" id="notes-input" rows="2" placeholder="Type your note here..." style="font-size: 0.8rem;">${getNote(state.questions[state.index]?.id)}</textarea>
      </div>
      <div class="q-options" id="opts">
        ${q.options.map((o, idx) => optHtml(o, idx, q, state.answers[state.index], isRevealed)).join('')}
      </div>
      <div id="feedback"></div>
      ${!isRevealed && state.answers[state.index] != null && immediate ? confidenceHtml() : ''}
      <div class="ui-btn-row ui-mt-lg">
        ${state.index > 0 ? '<button class="ui-btn ui-btn--secondary" id="prev">← Prev</button>' : ''}
        ${immediate && state.answers[state.index]==null ? '<button class="ui-btn ui-btn--secondary" id="skip">Skip</button>' : ''}
        ${immediate && !state.revealed && state.answers[state.index]!=null ? '<button class="ui-btn" id="check">Check answer <span class="ui-kbd-hint">Space/R</span></button>' : ''}
        ${state.index < state.questions.length-1
            ? '<button class="ui-btn" id="next">Next → <span class="ui-kbd-hint">Space</span></button>'
            : '<button class="ui-btn" id="finish">Finish ✓</button>'}
      </div>`;

    body.querySelectorAll('.ui-opt').forEach(el => {
      el.addEventListener('click', () => {
        if (busy || (immediate && state.revealed)) return;
        const idx = +el.dataset.idx;
        state = quizReducer(state, { type: 'select', answer: idx });
        startResponseTimer();
        _confidence = null;
        _errorType = null;
        if (!immediate) {
          body.querySelectorAll('.ui-opt').forEach(o => o.classList.remove('ui-opt--selected'));
          el.classList.add('ui-opt--selected');
        } else {
          render();
        }
      });
    });

    body.querySelectorAll('.ui-conf-btn').forEach(el => {
      el.addEventListener('click', () => {
        body.querySelectorAll('.ui-conf-btn').forEach(b => b.classList.remove('ui-conf-btn--active'));
        el.classList.add('ui-conf-btn--active');
        _confidence = parseInt(el.dataset.conf, 10);
      });
    });

    body.querySelectorAll('.ui-err-btn').forEach(el => {
      el.addEventListener('click', () => {
        body.querySelectorAll('.ui-err-btn').forEach(b => b.classList.remove('ui-err-btn--active'));
        el.classList.add('ui-err-btn--active');
        _errorType = el.dataset.err;
      });
    });

    const onCheck = async () => {
      busy = true;
      stopResponseTimer();
      try {
        state = quizReducer(state, { type: 'reveal' });
        const qq = state.questions[state.index];
        await record({ question: qq, chosen: state.answers[state.index], mode: state.mode, confidence: _confidence, errorType: _errorType, responseTime: _responseTimer });
        render();
        const fb = document.getElementById('feedback');
        const correct = state.answers[state.index] === qq.answer;
        if (fb) {
          fb.innerHTML = `<div class="ui-feedback"><span class="ui-feedback__tag">${correct ? '✅ Correct' : '❌ Wrong'}</span></div>`;
          if (!correct) {
            fb.insertAdjacentHTML('beforeend', errorClassificationHtml());
          }
          fb.insertAdjacentHTML('beforeend', `<div class="ui-feedback"><span class="ui-feedback__tag">Explanation:</span> <span class="ui-muted">loading…</span></div>`);
          const { text, source } = await explain(qq, state.answers[state.index]);
          const tag = source === 'cache' ? '✓ cached' : source === 'ai' ? '✨ AI' : '📖';
          fb.innerHTML = fb.innerHTML.replace('<span class="ui-muted">loading…</span>', esc(text)) +
            `<div class="ui-feedback" style="margin:4px 0"><span class="ui-feedback__tag">Explanation ${tag}</span></div>`;

          const concept = qq.skill || qq.topic;
          const memoryTip = getMemoryTip(concept, correct);
          if (memoryTip) {
            fb.insertAdjacentHTML('beforeend', `<div class="ui-feedback" style="margin-top: 6px; background: var(--surface-2); padding: 8px; border-radius: 6px;"><span class="ui-feedback__tag">🧠 Memory Tip:</span> ${esc(memoryTip)}</div>`);
          }

          const related = _relatedQuestions;
          if (related.length > 0) {
            fb.insertAdjacentHTML('beforeend', `<div style="margin-top: 8px; font-size: 0.8rem;"><span class="ui-feedback__tag">📎 Similar questions:</span>
              <div style="display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                ${related.slice(0, 3).map(rq => `<button class="ui-err-btn" data-related="${rq.id}">Q${rq.id}</button>`).join('')}
              </div></div>`);
          }

          fb.insertAdjacentHTML('beforeend', `<details class="ui-followup"><summary>Still confused? Ask a follow-up (uses neurons)</summary>
            <div class="ui-followup-body"><textarea id="doubt" rows="2" class="ui-textarea" placeholder="What part is unclear?"></textarea>
            <button class="ui-btn ui-btn--secondary" id="askfu">Ask</button></div></details>`);
          const ask = document.getElementById('askfu');
          if (ask) ask.addEventListener('click', async () => {
            try {
              const d = document.getElementById('doubt').value.trim();
              if (!d) return;
              ask.textContent = '…';
              const { text } = await (await import('../ai/client.js')).followup(qq, d);
              document.getElementById('feedback').insertAdjacentHTML('beforeend', `<div class="ui-feedback" style="margin-top: 8px;"><span class="ui-feedback__tag">You asked:</span> ${esc(d)}<br><b>Answer:</b> ${esc(text)}</div>`);
            } catch (e) {
              logError(e, { file: 'quiz.js', func: 'onCheck.ask', action: 'follow-up question', source: 'ui' });
              document.getElementById('feedback')?.insertAdjacentHTML('beforeend', '<div class="ui-feedback" style="margin-top:8px;color:var(--text-danger);"><span class="ui-feedback__tag">Error getting answer.</span></div>');
            }
          });
        }
      } finally {
        busy = false;
      }
    };

    document.getElementById('notes-toggle')?.addEventListener('click', () => {
      const area = document.getElementById('notes-area');
      area.style.display = area.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('notes-input')?.addEventListener('input', (e) => {
      saveNote(state.questions[state.index]?.id, e.target.value);
    });

    document.getElementById('bm-toggle')?.addEventListener('click', async () => {
      if (!state.questions[state.index]) return;
      const qid = state.questions[state.index].id;
      const idx = _bookmarks.indexOf(qid);
      if (idx >= 0) { _bookmarks.splice(idx, 1); }
      else { _bookmarks.push(qid); }
      await kvSet('bookmarks', _bookmarks);
      render();
    });
    document.getElementById('check')?.addEventListener('click', onCheck);
    document.getElementById('next')?.addEventListener('click', () => { state = quizReducer(state, { type: 'next' }); if (state.mode === 'planned' && !state.revealed) learningState.advance(); render(); });
    document.getElementById('prev')?.addEventListener('click', () => { state = quizReducer(state, { type: 'prev' }); render(); });
    document.getElementById('skip')?.addEventListener('click', () => { state = quizReducer(state, { type: 'skip' }); render(); });
    document.getElementById('finish')?.addEventListener('click', finish);
    document.getElementById('quit')?.addEventListener('click', () => {
      if (confirm('Exit this session? Your progress is saved.')) { stopTimer(); detachKeyboard(); go('home'); }
    });
  }

  async function finish() {
    stopTimer();
    detachKeyboard();
    state = quizReducer(state, { type: 'finish' });
    const answers = state.answers;
    if (state.mode === 'planned') {
      await learningState.transition(LEARNING_STATES.ASSESSMENT);
      await learningState.transition(LEARNING_STATES.REVIEW);
      await learningState.transition(LEARNING_STATES.COMPLETED);
    }
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

  attachKeyboard();
  render();
  return () => { stopTimer(); detachKeyboard(); };
}

export const MEMORY_TIPS = {
  synonym: 'Group words by meaning family — e.g. all "light" synonyms together.',
  antonym: 'Think of opposites in pairs — if you know one, the other follows.',
  tense: 'Draw a timeline. Past ← Present → Future. Place each tense on it.',
  voice: 'Ask: is the subject DOING or RECEIVING the action?',
  narration: 'Change pronouns first, then backshift tense, then remove quotes.',
  idiom: 'Visualize the literal meaning — the absurdity helps you remember.',
  spelling: 'Break into syllables. Say each one aloud.',
  comprehension: 'Read the questions before the passage — know what to look for.',
  article: 'Countable? Specific? First mention? These three questions decide it.',
  punctuation: 'Each mark = a specific pause length. Comma < Semicolon < Colon < Period.',
  pada_parichay: 'Identify the verb first. Everything else relates to it.',
  terminology: 'Learn the Latin/Greek root — it unlocks the whole family.',
  oneword: 'The most specific word is usually correct. Eliminate the broad ones.',
  homonym: 'Spelling is everything. Same sound, different meaning, different spelling.',
  error: 'Read the sentence aloud in your head. If it sounds wrong, it probably is.',
  improvement: 'Find the time reference first. Then pick the matching tense.',
  cloze: 'Read the whole passage first. Don\'t fill blanks as you go.',
  pqrs: 'Look for the opening sentence — it usually introduces a topic or person.',
};

export function getMemoryTip(concept, correct) {
  if (correct) return null;
  if (!concept) return null;
  const tip = MEMORY_TIPS[concept];
  if (tip) return tip;
  for (const [key, val] of Object.entries(MEMORY_TIPS)) {
    if (concept.includes(key) || key.includes(concept)) return val;
  }
  return null;
}

function optHtml(text, idx, q, selected, revealed) {
  const classes = ['ui-opt'];
  if (selected === idx && !revealed) classes.push('ui-opt--selected');
  if (revealed) {
    if (idx === q.answer) classes.push('ui-opt--correct');
    else if (selected === idx) classes.push('ui-opt--wrong');
  }
  if (revealed) classes.push('ui-opt--disabled');
  const hint = revealed ? '' : `<span class="ui-kbd-hint">${idx + 1}</span>`;
  return `<div class="${classes.join(' ')}" data-idx="${idx}"><span class="ui-opt__letter">${String.fromCharCode(65+idx)}</span><span class="ui-opt__text">${esc(text)}${hint}</span></div>`;
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function pad(n) { return String(n).padStart(2, '0'); }
