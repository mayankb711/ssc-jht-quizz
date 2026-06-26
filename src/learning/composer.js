import { QUESTIONS } from '../data/questions.js';
import { TOPICS } from '../data/topics.js';
import { allAttempts } from '../store/local.js';
import { getGeneratedBank } from '../ai/client.js';
import { knowledgeGraph } from './graph.js';
import { logError } from '../core/diagnostics.js';

export class SessionComposer {
  constructor(planner) {
    this.planner = planner;
  }

  async buildSession(plan) {
    try {
      const generated = await getGeneratedBank().catch(() => []);
      const bank = [...QUESTIONS, ...generated];
      const attempts = await allAttempts();
      const wrongIds = new Set(attempts.filter(a => !a.correct).map(a => a.question_id));
      const recentIds = new Map();
      attempts.slice(-100).forEach(a => {
        recentIds.set(a.question_id, a.ts);
      });

      const usedIds = new Set();
      const allQuestions = [];

      for (const segment of plan.segments) {
        let questions = [];

        switch (segment.type) {
          case 'warmup':
          case 'confidence_boost':
            questions = this.pickEasy(bank, usedIds, segment.count);
            break;

          case 'due_review':
          case 'spaced_review':
            if (segment.skill) {
              questions = this.pickBySkill(bank, usedIds, segment.skill, segment.count);
            }
            if (questions.length < segment.count) {
              const more = this.pickByTopic(bank, usedIds, segment.count - questions.length);
              questions.push(...more);
            }
            break;

          case 'weak_concept':
            if (segment.skill) {
              questions = this.pickBySkill(bank, usedIds, segment.count, segment.skill);
            }
            if (questions.length === 0) {
              questions = this.pickWrong(bank, usedIds, wrongIds, segment.count);
            }
            break;

          case 'new_material':
            if (segment.skill) {
              questions = this.pickUnseen(bank, usedIds, recentIds, segment.count, segment.skill);
            }
            if (questions.length === 0) {
              questions = this.pickRandom(bank, usedIds, segment.count);
            }
            break;

          case 'speed_drill':
            questions = this.pickMediumSpeed(bank, usedIds, segment.count);
            break;

          default:
            questions = this.pickRandom(bank, usedIds, segment.count);
        }

        segment.questions = questions;
        questions.forEach(q => usedIds.add(q.id));
        allQuestions.push(...questions);
      }

      return {
        plan,
        questions: this.shuffle(allQuestions),
        estimatedMinutes: this.planner.getEstimatedMinutesForPlan(plan),
        segments: plan.segments,
      };
    } catch (e) {
      logError(e, { file: 'composer.js', func: 'buildSession', action: 'compose learning session', source: 'learning' });
      const generated = await getGeneratedBank().catch(() => []);
      const bank = [...QUESTIONS, ...generated];
      return {
        plan,
        questions: this.shuffle(bank).slice(0, 20),
        estimatedMinutes: 20,
        segments: [{ type: 'fallback', label: 'General Practice', count: 20, questions: [] }],
      };
    }
  }

  pickEasy(bank, usedIds, count) {
    return this.shuffle(bank.filter(q => !usedIds.has(q.id) && (q.difficulty || 3) <= 2)).slice(0, count);
  }

  pickBySkill(bank, usedIds, skill, count) {
    return this.shuffle(bank.filter(q => !usedIds.has(q.id) && (q.skill === skill || q.topic === skill))).slice(0, count);
  }

  pickByTopic(bank, usedIds, count) {
    return this.shuffle(bank.filter(q => !usedIds.has(q.id))).slice(0, count);
  }

  pickWrong(bank, usedIds, wrongIds, count) {
    return this.shuffle(bank.filter(q => !usedIds.has(q.id) && wrongIds.has(q.id))).slice(0, count);
  }

  pickUnseen(bank, usedIds, recentIds, count, skill) {
    const unseen = bank.filter(q =>
      !usedIds.has(q.id) &&
      !recentIds.has(q.id) &&
      (skill ? (q.skill === skill || q.topic === skill) : true)
    );
    if (unseen.length >= count) return this.shuffle(unseen).slice(0, count);
    return this.shuffle(bank.filter(q => !usedIds.has(q.id) && !recentIds.has(q.id))).slice(0, count);
  }

  pickMediumSpeed(bank, usedIds, count) {
    const medium = bank.filter(q => !usedIds.has(q.id) && (q.difficulty || 3) >= 2 && (q.difficulty || 3) <= 4);
    return this.shuffle(medium).slice(0, count);
  }

  pickRandom(bank, usedIds, count) {
    return this.shuffle(bank.filter(q => !usedIds.has(q.id))).slice(0, count);
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
