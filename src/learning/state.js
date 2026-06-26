import { logError } from '../core/diagnostics.js';
import { emit, DomainEvents } from '../shared/events.js';

export const LEARNING_STATES = {
  PLANNING: 'planning',
  PREPARING: 'preparing',
  WARMUP: 'warmup',
  LEARNING: 'learning',
  ASSESSMENT: 'assessment',
  REVIEW: 'review',
  REFLECTION: 'reflection',
  COMPLETED: 'completed',
};

const STATE_FLOW = [
  LEARNING_STATES.PLANNING,
  LEARNING_STATES.PREPARING,
  LEARNING_STATES.WARMUP,
  LEARNING_STATES.LEARNING,
  LEARNING_STATES.ASSESSMENT,
  LEARNING_STATES.REVIEW,
  LEARNING_STATES.REFLECTION,
  LEARNING_STATES.COMPLETED,
];

const STATE_LABELS = {
  [LEARNING_STATES.PLANNING]: 'Planning your session',
  [LEARNING_STATES.PREPARING]: 'Preparing questions',
  [LEARNING_STATES.WARMUP]: 'Warm-up',
  [LEARNING_STATES.LEARNING]: 'Learning',
  [LEARNING_STATES.ASSESSMENT]: 'Assessment',
  [LEARNING_STATES.REVIEW]: 'Review',
  [LEARNING_STATES.REFLECTION]: 'Reflection',
  [LEARNING_STATES.COMPLETED]: 'Session Complete',
};

export class LearningStateMachine {
  constructor() {
    this.state = LEARNING_STATES.PLANNING;
    this.history = [];
    this.listeners = new Set();
    this.transitionCount = 0;
  }

  get current() { return this.state; }

  get label() { return STATE_LABELS[this.state] || this.state; }

  get progress() {
    const idx = STATE_FLOW.indexOf(this.state);
    return idx >= 0 ? (idx / (STATE_FLOW.length - 1)) * 100 : 0;
  }

  get isActive() {
    return this.state !== LEARNING_STATES.COMPLETED;
  }

  get canAdvance() {
    const idx = STATE_FLOW.indexOf(this.state);
    return idx >= 0 && idx < STATE_FLOW.length - 1;
  }

  get canRegress() {
    const idx = STATE_FLOW.indexOf(this.state);
    return idx > 0;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async transition(to, context = {}) {
    const valid = STATE_FLOW.includes(to);
    if (!valid) {
      logError(new Error(`Invalid state: ${to}`), { file: 'state.js', func: 'transition', source: 'learning' });
      return false;
    }

    const from = this.state;
    this.history.push({ from, to, ts: Date.now(), context });
    this.state = to;
    this.transitionCount++;

    emit(DomainEvents.NAVIGATION_CHANGED, { from, to, label: this.label });

    for (const fn of this.listeners) {
      try { fn(to, from, context); } catch (e) { /* ignore listener errors */ }
    }

    return true;
  }

  advance(context = {}) {
    const idx = STATE_FLOW.indexOf(this.state);
    if (idx >= 0 && idx < STATE_FLOW.length - 1) {
      return this.transition(STATE_FLOW[idx + 1], context);
    }
    return false;
  }

  regress(context = {}) {
    const idx = STATE_FLOW.indexOf(this.state);
    if (idx > 0) {
      return this.transition(STATE_FLOW[idx - 1], context);
    }
    return false;
  }

  reset() {
    this.state = LEARNING_STATES.PLANNING;
    this.history = [];
    this.transitionCount = 0;
  }

  getSessionStats() {
    const duration = this.history.length > 0
      ? Date.now() - this.history[0].ts
      : 0;
    return {
      duration,
      transitions: this.transitionCount,
      currentState: this.state,
      currentLabel: this.label,
      completedStates: this.history.map(h => h.to),
    };
  }
}

export const learningState = new LearningStateMachine();
