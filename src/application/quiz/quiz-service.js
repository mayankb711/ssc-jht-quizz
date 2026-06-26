/* ============================================================
   application/quiz/quiz-service.js — Quiz business logic service
 * Coordinates quiz operations using repositories and domain logic
 * ============================================================ */

import { createQuizSession } from './state-machine.js';
import { pick } from '../../core/engine.js';
import { startMock, finishMock } from '../../core/mocktest.js';
import { record } from '../../core/progress.js';
import { quizEvents } from '../../shared/events.js';

/**
 * Quiz Service
 * Business logic layer for quiz operations
 */
export default class QuizService {
  constructor(repositories) {
    this.repositories = repositories;
    this.currentSession = null;
  }

  /**
   * Start a quiz session
   */
  async startQuiz(mode, options = {}) {
    const { subject, topic, n, questions: customQuestions } = options;
    
    let questions = [];
    let timed = false;
    let deadline = null;

    // Get questions based on mode
    if (mode === 'mock') {
      const mock = await startMock();
      questions = mock.questions;
      timed = true;
      deadline = mock.deadline;
    } else if (customQuestions && customQuestions.length > 0) {
      questions = customQuestions;
    } else {
      questions = await pick({ subject, topic, n });
    }

    if (questions.length === 0) {
      throw new Error('No questions available for this selection');
    }

    // Create session
    this.currentSession = createQuizSession({
      mode,
      questions,
      metadata: { subject, topic },
    });

    // Initialize and start
    this.currentSession.transition('INIT', { mode, questions });
    
    if (timed) {
      this.currentSession.transition('SET_TIMING', { timed, deadline });
    }
    
    this.currentSession.transition('START');

    quizEvents.emit('started', {
      mode,
      questionCount: questions.length,
      timed,
    });

    return this.currentSession;
  }

  /**
   * Start mistakes review mode
   */
  async startMistakesMode() {
    const attempts = await this.repositories.attempts.getAll();
    const allQuestions = await this.repositories.questions.getAll();
    
    const wrongIds = [...new Set(attempts.filter(a => !a.correct).map(a => a.question_id))];
    let questions = wrongIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean);
    
    // Dedupe and cap
    questions = questions.slice(0, 40);
    
    if (questions.length === 0) {
      throw new Error('No mistakes to review yet');
    }

    return this.startQuiz('mistakes', { questions });
  }

  /**
   * Record quiz results
   */
  async recordResults(session) {
    const summary = session.getSummary();
    const questions = session.state.questions;
    const answers = session.state.answers;

    const attempts = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answer = answers[i];
      
      if (answer !== null) {
        attempts.push({
          id: `${question.id}-${Date.now()}-${i}`,
          question_id: question.id,
          topic: question.topic,
          skill: question.skill,
          selected: answer,
          correct: answer === question.answer,
          ts: Date.now(),
          mode: session.state.mode,
          confidence: null,
          time_spent: null,
        });
      }
    }

    // Save attempts
    for (const attempt of attempts) {
      await this.repositories.attempts.add(attempt);
    }

    // Update progress
    await record(summary);

    quizEvents.emit('finished', {
      mode: session.state.mode,
      summary,
      attemptsCount: attempts.length,
    });

    return summary;
  }

  /**
   * Finish current quiz session
   */
  async finishQuiz() {
    if (!this.currentSession) {
      throw new Error('No active quiz session');
    }

    this.currentSession.transition('FINISH');
    const summary = await this.recordResults(this.currentSession);
    
    // Clean up
    this.currentSession = null;
    
    return summary;
  }

  /**
   * Abandon current quiz session
   */
  async abandonQuiz() {
    if (!this.currentSession) {
      throw new Error('No active quiz session');
    }

    this.currentSession.transition('ABANDON');
    
    quizEvents.emit('abandoned', {
      mode: this.currentSession.state.mode,
      currentIndex: this.currentSession.state.currentIndex,
    });

    this.currentSession = null;
  }

  /**
   * Get current session
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession() {
    return this.currentSession !== null && !this.currentSession.isComplete();
  }
}