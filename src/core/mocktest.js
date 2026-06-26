/* ============================================================
   mocktest.js — the 200-question, 2-hour, negative-marking
   simulator. Wraps the engine's pickMock and holds session state.
   ============================================================ */

import { pickMock, DEFAULT_MOCK_STRUCTURE } from './engine.js';
import { record, scoreSession } from './progress.js';
import { APP } from '../config/app.js';

export const MOCK = {
  count: 200,
  durationMs: 2 * 60 * 60 * 1000,   // 2 hours
  negative: APP.negativeMarking,
};

/** Start a fresh mock test: returns {questions, startedAt, deadline}. */
export async function startMock() {
  const questions = await pickMock(DEFAULT_MOCK_STRUCTURE);
  const startedAt = Date.now();
  return { questions, startedAt, deadline: startedAt + MOCK.durationMs };
}

/** Finalize: records every answer, returns scored result. */
export async function finishMock(questions, answers) {
  const attempts = [];
  for (let i = 0; i < questions.length; i++) {
    const chosen = answers[i] ?? null;     // null = unattempted
    const a = await record({ question: questions[i], chosen, mode: 'mock' });
    attempts.push(a);
  }
  const scored = scoreSession(attempts);
  return { ...scored, outOf: questions.length };
}
