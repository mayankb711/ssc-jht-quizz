/* ============================================================
   features/quiz/session.js — Quiz session reducer (legacy compatibility)
 * Maintains backward compatibility while migrating to state machine
 * ============================================================ */

import { createQuizSession } from '../../application/quiz/state-machine.js';

export const quizInitialState = (questions = [], mode = 'quick') => ({
  mode,
  questions,
  index: 0,
  answers: Array(questions.length).fill(null),
  revealed: false,
  timed: false,
  deadline: 0,
  startedAt: Date.now(),
  finished: false,
});

/**
 * Legacy quiz reducer for backward compatibility
 * New code should use QuizStateMachine from application/quiz/state-machine.js
 */
export function quizReducer(state, action) {
  switch (action.type) {
    case 'set_timing':
      return { ...state, timed: !!action.timed, deadline: action.deadline || 0 };
    case 'select':
      return { ...state, answers: state.answers.map((a, i) => i === state.index ? action.answer : a) };
    case 'reveal':
      return { ...state, revealed: true };
    case 'next':
      return { ...state, index: Math.min(state.questions.length - 1, state.index + 1), revealed: false };
    case 'prev':
      return { ...state, index: Math.max(0, state.index - 1), revealed: false };
    case 'skip':
      return { ...state, index: Math.min(state.questions.length - 1, state.index + 1), revealed: false };
    case 'finish':
      return { ...state, finished: true };
    case 'load_answers':
      return { ...state, answers: action.answers || state.answers };
    default:
      return state;
  }
}

/**
 * Create a new state machine session from legacy state
 */
export function createStateMachineFromLegacy(legacyState) {
  const session = createQuizSession({
    mode: legacyState.mode,
    questions: legacyState.questions,
  });

  // Initialize the session
  session.transition('INIT', {
    mode: legacyState.mode,
    questions: legacyState.questions,
  });

  // Start the session if it was started
  if (legacyState.startedAt) {
    session.transition('START');
  }

  // Set timing if configured
  if (legacyState.timed) {
    session.transition('SET_TIMING', {
      timed: true,
      deadline: legacyState.deadline,
    });
  }

  // Replay answers
  for (let i = 0; i < legacyState.answers.length; i++) {
    const answer = legacyState.answers[i];
    if (answer !== null) {
      // Navigate to the question
      while (session.state.currentIndex !== i) {
        if (session.state.currentIndex < i) {
          session.transition('NEXT');
        } else {
          session.transition('PREVIOUS');
        }
      }
      
      // Select the answer
      session.transition('SELECT_ANSWER', { answer });
      
      // Reveal if this question was revealed
      if (i === legacyState.index && legacyState.revealed) {
        session.transition('REVEAL');
      }
    }
  }

  // Finish if legacy state was finished
  if (legacyState.finished) {
    session.transition('FINISH');
  }

  return session;
}

/**
 * Convert state machine state back to legacy format
 */
export function convertToLegacyState(session) {
  const state = session.state;
  return {
    mode: state.mode,
    questions: state.questions,
    index: state.currentIndex,
    answers: state.answers,
    revealed: state.revealed,
    timed: state.timed,
    deadline: state.deadline || 0,
    startedAt: state.startedAt || Date.now(),
    finished: state.state === 'FINISHED',
  };
}
