/* ============================================================
   application/quiz/state-machine.js — Quiz session state machine
 * Explicit state transitions for quiz sessions with validation
 * ============================================================ */

import { quizEvents, DomainEvents } from '../../shared/events.js';

/**
 * Quiz session states
 */
export const QuizStates = {
  IDLE: 'IDLE',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  FEEDBACK: 'FEEDBACK',
  FINISHED: 'FINISHED',
  ABANDONED: 'ABANDONED',
};

/**
 * Quiz session state machine
 * Manages quiz session lifecycle with explicit state transitions
 */
export class QuizStateMachine {
  constructor(initialState) {
    this.state = this.createInitialState(initialState);
    this.history = [];
    this.listeners = new Map();
  }

  /**
   * Create initial state with validation
   */
  createInitialState(config = {}) {
    return {
      state: QuizStates.IDLE,
      mode: config.mode || 'quick',
      questions: config.questions || [],
      currentIndex: 0,
      answers: [],
      revealed: false,
      timed: false,
      deadline: null,
      startedAt: null,
      finishedAt: null,
      timeRemaining: null,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      metadata: config.metadata || {},
    };
  }

  /**
   * Current state getter
   */
  get currentState() {
    return this.state.state;
  }

  /**
   * Transition to a new state
   */
  transition(action, payload = {}) {
    const previousState = { ...this.state };
    
    try {
      const newState = this.handleAction(this.state, action, payload);
      
      // Validate state transition
      if (!this.isValidTransition(previousState.state, newState.state)) {
        throw new Error(`Invalid state transition: ${previousState.state} -> ${newState.state}`);
      }
      
      // Update state
      this.state = newState;
      this.history.push({ previousState, action, payload, timestamp: Date.now() });
      
      // Emit internal state change event
      this.emit('stateChanged', {
        previousState: previousState.state,
        newState: newState.state,
        action,
        payload,
      });
      
      // Emit domain events based on action
      this.emitDomainEvent(action, payload, newState);
      
      return this.state;
    } catch (err) {
      this.emit('error', { error: err, action, payload });
      throw err;
    }
  }

  /**
   * Handle actions based on current state
   */
  handleAction(state, action, payload) {
    switch (action) {
      case 'INIT':
        return this.handleInit(state, payload);
      case 'START':
        return this.handleStart(state, payload);
      case 'SELECT_ANSWER':
        return this.handleSelectAnswer(state, payload);
      case 'REVEAL':
        return this.handleReveal(state, payload);
      case 'NEXT':
        return this.handleNext(state, payload);
      case 'PREVIOUS':
        return this.handlePrevious(state, payload);
      case 'SKIP':
        return this.handleSkip(state, payload);
      case 'PAUSE':
        return this.handlePause(state, payload);
      case 'RESUME':
        return this.handleResume(state, payload);
      case 'FINISH':
        return this.handleFinish(state, payload);
      case 'ABANDON':
        return this.handleAbandon(state, payload);
      case 'SET_TIMING':
        return this.handleSetTiming(state, payload);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Action handlers
   */
  handleInit(state, payload) {
    if (state.state !== QuizStates.IDLE) {
      throw new Error('Can only init from IDLE state');
    }

    return {
      ...state,
      state: QuizStates.READY,
      questions: payload.questions || state.questions,
      mode: payload.mode || state.mode,
      metadata: { ...state.metadata, ...payload.metadata },
    };
  }

  handleStart(state, payload) {
    if (state.state !== QuizStates.READY) {
      throw new Error('Can only start from READY state');
    }

    if (state.questions.length === 0) {
      throw new Error('Cannot start quiz with no questions');
    }

    return {
      ...state,
      state: QuizStates.ACTIVE,
      startedAt: Date.now(),
      answers: Array(state.questions.length).fill(null),
      currentIndex: 0,
      revealed: false,
    };
  }

  handleSelectAnswer(state, payload) {
    if (state.state !== QuizStates.ACTIVE && state.state !== QuizStates.FEEDBACK) {
      throw new Error('Can only select answer in ACTIVE or FEEDBACK state');
    }

    if (typeof payload.answer !== 'number' || payload.answer < 0 || payload.answer > 3) {
      throw new Error('Invalid answer selection');
    }

    const newAnswers = [...state.answers];
    newAnswers[state.currentIndex] = payload.answer;

    return {
      ...state,
      answers: newAnswers,
    };
  }

  handleReveal(state, payload) {
    if (state.state !== QuizStates.ACTIVE) {
      throw new Error('Can only reveal in ACTIVE state');
    }

    if (state.answers[state.currentIndex] === null) {
      throw new Error('Cannot reveal without selecting an answer');
    }

    // Update counts based on answer
    const currentQuestion = state.questions[state.currentIndex];
    const isCorrect = state.answers[state.currentIndex] === currentQuestion.answer;
    
    return {
      ...state,
      state: QuizStates.FEEDBACK,
      revealed: true,
      correctCount: isCorrect ? state.correctCount + 1 : state.correctCount,
      wrongCount: isCorrect ? state.wrongCount : state.wrongCount + 1,
    };
  }

  handleNext(state, payload) {
    if (state.state !== QuizStates.ACTIVE && state.state !== QuizStates.FEEDBACK) {
      throw new Error('Can only go next in ACTIVE or FEEDBACK state');
    }

    const nextIndex = Math.min(state.questions.length - 1, state.currentIndex + 1);
    const isLastQuestion = nextIndex === state.currentIndex;

    if (isLastQuestion) {
      // Auto-finish if it's the last question
      return this.handleFinish(state, payload);
    }

    return {
      ...state,
      state: QuizStates.ACTIVE,
      currentIndex: nextIndex,
      revealed: false,
    };
  }

  handlePrevious(state, payload) {
    if (state.state !== QuizStates.ACTIVE && state.state !== QuizStates.FEEDBACK) {
      throw new Error('Can only go previous in ACTIVE or FEEDBACK state');
    }

    const prevIndex = Math.max(0, state.currentIndex - 1);

    return {
      ...state,
      state: QuizStates.ACTIVE,
      currentIndex: prevIndex,
      revealed: false,
    };
  }

  handleSkip(state, payload) {
    if (state.state !== QuizStates.ACTIVE) {
      throw new Error('Can only skip in ACTIVE state');
    }

    const newAnswers = [...state.answers];
    // Mark as skipped (null but counted)
    
    const nextIndex = Math.min(state.questions.length - 1, state.currentIndex + 1);
    const isLastQuestion = nextIndex === state.currentIndex;

    if (isLastQuestion) {
      return this.handleFinish(state, payload);
    }

    return {
      ...state,
      state: QuizStates.ACTIVE,
      currentIndex: nextIndex,
      revealed: false,
      skippedCount: state.skippedCount + 1,
    };
  }

  handlePause(state, payload) {
    if (state.state !== QuizStates.ACTIVE) {
      throw new Error('Can only pause in ACTIVE state');
    }

    return {
      ...state,
      state: QuizStates.PAUSED,
    };
  }

  handleResume(state, payload) {
    if (state.state !== QuizStates.PAUSED) {
      throw new Error('Can only resume from PAUSED state');
    }

    return {
      ...state,
      state: QuizStates.ACTIVE,
    };
  }

  handleFinish(state, payload) {
    if (state.state !== QuizStates.ACTIVE && state.state !== QuizStates.FEEDBACK && state.state !== QuizStates.PAUSED) {
      throw new Error('Can only finish from ACTIVE, FEEDBACK, or PAUSED state');
    }

    // Calculate final score
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    state.questions.forEach((q, i) => {
      const answer = state.answers[i];
      if (answer === null) {
        skippedCount++;
      } else if (answer === q.answer) {
        correctCount++;
        score += 1; // Base score
      } else {
        wrongCount++;
        // Negative marking for mock mode
        if (state.mode === 'mock') {
          score -= 0.25;
        }
      }
    });

    return {
      ...state,
      state: QuizStates.FINISHED,
      finishedAt: Date.now(),
      score,
      correctCount,
      wrongCount,
      skippedCount,
    };
  }

  handleAbandon(state, payload) {
    return {
      ...state,
      state: QuizStates.ABANDONED,
      finishedAt: Date.now(),
    };
  }

  handleSetTiming(state, payload) {
    if (state.state !== QuizStates.READY && state.state !== QuizStates.IDLE) {
      throw new Error('Can only set timing in READY or IDLE state');
    }

    return {
      ...state,
      timed: !!payload.timed,
      deadline: payload.deadline || null,
    };
  }

  /**
   * Validate state transitions
   */
  isValidTransition(fromState, toState) {
    const validTransitions = {
      [QuizStates.IDLE]: [QuizStates.READY],
      [QuizStates.READY]: [QuizStates.ACTIVE, QuizStates.ABANDONED],
      [QuizStates.ACTIVE]: [QuizStates.FEEDBACK, QuizStates.PAUSED, QuizStates.FINISHED, QuizStates.ABANDONED],
      [QuizStates.FEEDBACK]: [QuizStates.ACTIVE, QuizStates.FINISHED, QuizStates.ABANDONED],
      [QuizStates.PAUSED]: [QuizStates.ACTIVE, QuizStates.ABANDONED],
      [QuizStates.FINISHED]: [], // Terminal state
      [QuizStates.ABANDONED]: [], // Terminal state
    };

    return validTransitions[fromState]?.includes(toState) || false;
  }

  /**
   * Event handling
   */
  on(event, listener) {
    const set = this.listeners.get(event) || new Set();
    set.add(listener);
    this.listeners.set(event, set);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, payload) {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of [...set]) {
        try {
          listener(payload);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      }
    }
  }

  /**
   * Get current question
   */
  getCurrentQuestion() {
    if (this.state.currentIndex >= 0 && this.state.currentIndex < this.state.questions.length) {
      return this.state.questions[this.state.currentIndex];
    }
    return null;
  }

  /**
   * Get progress percentage
   */
  getProgress() {
    if (this.state.questions.length === 0) return 0;
    return Math.round((this.state.currentIndex / this.state.questions.length) * 100);
  }

  /**
   * Get time remaining
   */
  getTimeRemaining() {
    if (!this.state.timed || !this.state.deadline) return null;
    return Math.max(0, this.state.deadline - Date.now());
  }

  /**
   * Check if quiz is complete
   */
  isComplete() {
    return this.state.state === QuizStates.FINISHED || this.state.state === QuizStates.ABANDONED;
  }

  /**
   * Get session summary
   */
  getSummary() {
    return {
      mode: this.state.mode,
      totalQuestions: this.state.questions.length,
      answered: this.state.answers.filter(a => a !== null).length,
      correct: this.state.correctCount,
      wrong: this.state.wrongCount,
      skipped: this.state.skippedCount,
      score: this.state.score,
      startedAt: this.state.startedAt,
      finishedAt: this.state.finishedAt,
      duration: this.state.finishedAt ? this.state.finishedAt - this.state.startedAt : null,
    };
  }

  /**
   * Emit domain events based on state transitions
   */
  emitDomainEvent(action, payload, newState) {
    switch (action) {
      case 'START':
        quizEvents.emit('started', {
          mode: newState.mode,
          questionCount: newState.questions.length,
          timed: newState.timed,
        });
        break;
        
      case 'FINISH':
        quizEvents.emit('finished', {
          mode: newState.mode,
          summary: this.getSummary(),
        });
        break;
        
      case 'ABANDON':
        quizEvents.emit('abandoned', {
          mode: newState.mode,
          currentIndex: newState.currentIndex,
          answered: newState.answers.filter(a => a !== null).length,
        });
        break;
        
      case 'PAUSE':
        quizEvents.emit('paused', {
          currentIndex: newState.currentIndex,
          timeRemaining: this.getTimeRemaining(),
        });
        break;
        
      case 'RESUME':
        quizEvents.emit('resumed', {
          currentIndex: newState.currentIndex,
        });
        break;
        
      case 'SELECT_ANSWER':
        quizEvents.emit('question_answered', {
          questionId: newState.questions[newState.currentIndex]?.id,
          answer: payload.answer,
          questionIndex: newState.currentIndex,
        });
        break;
        
      case 'REVEAL':
        quizEvents.emit('question_revealed', {
          questionId: newState.questions[newState.currentIndex]?.id,
          questionIndex: newState.currentIndex,
          correct: newState.correctCount,
          wrong: newState.wrongCount,
        });
        break;
        
      case 'SKIP':
        quizEvents.emit('question_skipped', {
          questionId: newState.questions[newState.currentIndex]?.id,
          questionIndex: newState.currentIndex,
        });
        break;
    }
  }
}

/**
 * Factory function to create a quiz session
 */
export function createQuizSession(config) {
  return new QuizStateMachine(config);
}