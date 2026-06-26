/* ============================================================
   features/quiz/index.js — Quiz feature exports
 * Centralizes quiz-related functionality
 * ============================================================ */

export { createQuizSession, QuizStateMachine, QuizStates } from './state-machine.js';
export { quizInitialState, quizReducer, createStateMachineFromLegacy, convertToLegacyState } from './session.js';

// Re-export from application layer
export { default as QuizService } from '../../application/quiz/quiz-service.js';