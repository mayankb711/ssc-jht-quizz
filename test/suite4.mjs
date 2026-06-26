import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE = `http://localhost:${Number(process.env.PORT) || 5173}`;
const RESULTS_FILE = resolve('test', 'results4.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('=== Suite 4: Learning Module Unit Tests ===\n');
  let passed = 0, failed = 0;
  const errors = [];

  function ok(msg) { passed++; console.log(`  \u2705 ${msg}`); }
  function fail(msg) { failed++; console.log(`  \u274c ${msg}`); }
  function check(result, label) {
    if (result.ok) return ok(`${label} (${result.count} assertions)`);
    fail(`${label} — ${result.count} total assertions, some FAILED`);
    if (result.error) console.log(`       Error: ${result.error}`);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);

    // --- 1. GOALS MODULE ---
    console.log('1. goals.js unit tests');
    const goalsR = await page.evaluate(() => {
      return import('/src/learning/goals.js').then(mod => {
        const r = [];
        const e1 = mod.computeMentalEnergy({});
        r.push(typeof e1.energy === 'number' && e1.energy >= 0.1 && e1.energy <= 1);
        r.push(['high', 'medium', 'low'].includes(e1.level));
        r.push(typeof e1.fatigue === 'number');
        r.push(typeof e1.sessionFatigue === 'number');
        r.push(typeof e1.timeOfDayPenalty === 'number');
        const s1 = mod.shouldStopSession(0.5, { fatigue: { current: 0.1 }, domains: {} });
        r.push(s1.stop === false && s1.reason === null);
        const s2 = mod.shouldStopSession(0.3, { fatigue: { current: 0.8 }, domains: {} });
        r.push(s2.stop === true && typeof s2.reason === 'string');
        const s3 = mod.shouldStopSession(0.7, { fatigue: { current: 0.8 }, domains: {} });
        r.push(s3.stop === true);
        const w1 = mod.estimateIdealWorkload({});
        r.push(typeof w1.idealCount === 'number' && w1.idealCount >= 5);
        r.push(typeof w1.estimatedMinutes === 'number' && w1.estimatedMinutes > 0);
        r.push(['high', 'medium', 'low'].includes(w1.energy));
        const g1 = mod.getTodayGoal({});
        r.push(typeof g1.target === 'number');
        r.push(typeof g1.remaining === 'number');
        r.push(g1.progress >= 0 && g1.progress <= 1);
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(goalsR, 'goals.js');

    // --- 2. EXPLAIN MODULE ---
    console.log('\n2. explain.js unit tests');
    const explainR = await page.evaluate(() => {
      return import('/src/learning/explain.js').then(mod => {
        const r = [];
        // classifyReason returns { id, label, icon, keywords }
        const cr1 = mod.classifyReason({ skill: 'inference', correct_count: 0 }, 0, 'wrong_answer');
        r.push(typeof cr1 === 'object' && cr1 !== null);
        r.push(typeof cr1.id === 'string');
        r.push(typeof cr1.label === 'string');
        const cr2 = mod.classifyReason({ skill: 'rarest', correct_count: 3 }, 2, null);
        r.push(typeof cr2 === 'object');
        r.push(typeof cr2.label === 'string');
        const cr3 = mod.classifyReason({}, 0, null);
        r.push(typeof cr3 === 'object');
        r.push(cr3.id === 'unknown');
        const q = { id: 'h001', options: ['A', 'B', 'C', 'D'], answer: 0, stem: 'Test?', explain: 'A is correct because...', topic: 'hi_synonym' };
        const de1 = mod.generateDetailedExplanation(q, 0, true);
        r.push(typeof de1 === 'string');
        const de2 = mod.generateDetailedExplanation(q, 1, false);
        r.push(typeof de2 === 'string' && de2.length > 0);
        r.push(de2.includes('Correct answer'));
        const h1 = mod.generateHint(q, 0);
        r.push(h1 === null);
        const h2 = mod.generateHint(q, 1);
        r.push(typeof h2 === 'string' && h2.length > 0);
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(explainR, 'explain.js');

    // --- 3. SKILLS MODULE ---
    console.log('\n3. skills.js unit tests');
    const skillsR = await page.evaluate(() => {
      return import('/src/learning/skills.js').then(mod => {
        const r = [];
        r.push(typeof mod.SKILL_DOMAINS === 'object');
        r.push(typeof mod.SKILL_TYPES === 'object');
        r.push(Array.isArray(mod.CONCEPT_TAGS));
        const t = mod.getSkillType('inference');
        r.push(typeof t === 'string');
        const l = mod.getSkillLabel('inference');
        r.push(typeof l === 'string');
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(skillsR, 'skills.js');

    // --- 4. STATE MACHINE ---
    console.log('\n4. learning/state.js unit tests');
    const stateR = await page.evaluate(() => {
      return import('/src/learning/state.js').then(mod => {
        const r = [];
        r.push(typeof mod.LEARNING_STATES === 'object');
        r.push(mod.LEARNING_STATES.PLANNING === 'planning');
        r.push(mod.LEARNING_STATES.LEARNING === 'learning');
        r.push(mod.LEARNING_STATES.COMPLETED === 'completed');
        r.push(typeof mod.LearningStateMachine === 'function');
        r.push(typeof mod.learningState === 'object');
        const lsm = new mod.LearningStateMachine();
        r.push(lsm.current === 'planning');
        r.push(typeof lsm.canAdvance === 'boolean');
        r.push(lsm.canAdvance === true);
        r.push(typeof lsm.label === 'string');
        r.push(lsm.label.length > 0);
        r.push(typeof lsm.transitionCount === 'number');
        r.push(lsm.transitionCount === 0);
        r.push(typeof lsm.advance === 'function');
        r.push(typeof lsm.transition === 'function');
        r.push(typeof lsm.subscribe === 'function');
        r.push(typeof lsm.getSessionStats === 'function');
        const stats = lsm.getSessionStats();
        r.push(typeof stats === 'object');
        r.push(stats.transitions === 0);
        r.push(typeof lsm.reset === 'function');
        // advance and check
        lsm.advance();
        r.push(lsm.current !== 'planning' || lsm.transitionCount > 0);
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(stateR, 'learning/state.js');

    // --- 5. QUESTION BANK ---
    console.log('\n5. questionBank.js unit tests');
    const qbR = await page.evaluate(() => {
      return import('/src/learning/questionBank.js').then(mod => {
        const r = [];
        const dm = mod.defaultQuestionMeta();
        r.push(typeof dm === 'object');
        r.push(dm.attempts === 0);
        r.push(dm.correct === 0);
        return mod.loadQuestionBank().then(qb => {
          r.push(typeof qb === 'object');
          return mod.updateQuestionMeta('h001', { correct: true, responseTime: 5000, confidence: 4 }).then(() => {
            return mod.getQuestionMeta('h001').then(meta => {
              r.push(meta === null || typeof meta === 'object');
              return { ok: r.every(Boolean), count: r.length };
            });
          });
        });
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(qbR, 'questionBank.js');

    // --- 6. GRAPH MODULE ---
    console.log('\n6. graph.js unit tests');
    const graphR = await page.evaluate(() => {
      return import('/src/learning/graph.js').then(mod => {
        const r = [];
        r.push(typeof mod.KnowledgeGraph === 'function');
        r.push(typeof mod.knowledgeGraph === 'object');
        const kg = new mod.KnowledgeGraph();
        r.push(typeof kg.init === 'function');
        r.push(typeof kg.getRelatedQuestions === 'function');
        r.push(typeof kg.getConceptsForQuestion === 'function');
        r.push(typeof kg.getQuestionsForConcept === 'function');
        r.push(typeof kg.getRelatedConcepts === 'function');
        r.push(typeof kg.getLearningPath === 'function');
        // init and query
        return kg.init().then(() => {
          const rel = kg.getRelatedQuestions('h001');
          r.push(Array.isArray(rel));
          const conc = kg.getConceptsForQuestion('h001');
          r.push(Array.isArray(conc) && conc.length > 0);
          const qc = kg.getQuestionsForConcept('hi_synonym');
          r.push(Array.isArray(qc));
          const rc = kg.getRelatedConcepts('hi_synonym');
          r.push(Array.isArray(rc));
          const path = kg.getLearningPath('hi_synonym', 'hi_antonym');
          r.push(path === null || Array.isArray(path));
          return { ok: r.every(Boolean), count: r.length };
        });
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(graphR, 'graph.js');

    // --- 7. MEMORY MODULE ---
    console.log('\n7. memory.js unit tests');
    const memR = await page.evaluate(() => {
      return import('/src/learning/memory.js').then(mod => {
        const r = [];
        r.push(typeof mod.MemoryModel === 'function');
        const mm = new mod.MemoryModel({});
        r.push(typeof mm.computeStrength === 'function');
        r.push(typeof mm.computeRecallProbability === 'function');
        r.push(typeof mm.computeDecayRate === 'function');
        r.push(typeof mm.computeNextReview === 'function');
        r.push(typeof mm.getForgettingCurve === 'function');
        r.push(typeof mm.predictTomorrowRecall === 'function');
        // Test with various skill states
        const s1 = mm.computeStrength(null);
        r.push(typeof s1 === 'number' && s1 >= 0 && s1 <= 1);
        const s2 = mm.computeStrength({ attempts: 0 });
        r.push(s2 === 0.5);
        const s3 = mm.computeStrength({ attempts: 5, mastery: 0.8, consistency: 0.7, speed: 1.2, confidence: 0.9, lastReview: Date.now() });
        r.push(typeof s3 === 'number' && s3 >= 0 && s3 <= 1);
        const rp1 = mm.computeRecallProbability(null);
        r.push(rp1 === 0.5);
        const rp2 = mm.computeRecallProbability({ attempts: 5, mastery: 0.8, memoryStrength: 0.7, lastReview: Date.now(), decayRate: 0.05 });
        r.push(typeof rp2 === 'number' && rp2 >= 0 && rp2 <= 1);
        const dr = mm.computeDecayRate(null);
        r.push(dr === 0.1);
        const nr = mm.computeNextReview(null);
        r.push(typeof nr === 'number' && nr <= Date.now());
        const fc = mm.getForgettingCurve({ attempts: 3, mastery: 0.7, memoryStrength: 0.6, lastReview: Date.now() - 86400000, decayRate: 0.05, confidence: 0.5, speed: 1, consistency: 0.6 });
        r.push(Array.isArray(fc) && fc.length > 0);
        r.push(typeof fc[0] === 'object' && 'day' in fc[0] && 'probability' in fc[0]);
        const tm = mm.predictTomorrowRecall({ attempts: 5, mastery: 0.8, memoryStrength: 0.7, lastReview: Date.now() - 86400000, decayRate: 0.05, confidence: 0.5, speed: 1, consistency: 0.6 });
        r.push(typeof tm === 'number' && tm >= 0 && tm <= 1);
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(memR, 'memory.js');

    // --- 8. VELOCITY MODULE ---
    console.log('\n8. velocity.js unit tests');
    const velR = await page.evaluate(() => {
      return import('/src/learning/velocity.js').then(mod => {
        const r = [];
        r.push(typeof mod.computeTopicVelocity === 'function');
        r.push(typeof mod.getLearningDNA === 'function');
        return mod.computeTopicVelocity().then(v => {
          r.push(typeof v === 'object');
          return mod.getLearningDNA().then(dna => {
            r.push(dna === null || typeof dna === 'object');
            return { ok: r.every(Boolean), count: r.length };
          });
        });
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(velR, 'velocity.js');

    // --- 9. ANALYTICS MODULE ---
    console.log('\n9. analytics.js unit tests');
    const anR = await page.evaluate(() => {
      return import('/src/learning/analytics.js').then(mod => {
        const r = [];
        r.push(typeof mod.AnalyticsEngine === 'function');
        const ae = new mod.AnalyticsEngine();
        r.push(typeof ae.init === 'function');
        r.push(typeof ae.getDailyProgress === 'function');
        r.push(typeof ae.getTopicMastery === 'function');
        r.push(typeof ae.getWeaknessTrends === 'function');
        r.push(typeof ae.getSpeedTrends === 'function');
        r.push(typeof ae.getConfidenceCalibration === 'function');
        r.push(typeof ae.getPredictedScore === 'function');
        r.push(typeof ae.getRecommendedFocus === 'function');
        r.push(typeof ae.invalidateCache === 'function');
        return ae.init().then(() => {
          return ae.getDailyProgress().then(dp => {
            r.push(typeof dp === 'object');
            return ae.getTopicMastery().then(tm => {
              r.push(Array.isArray(tm));
              return ae.getRecommendedFocus().then(rf => {
                r.push(typeof rf === 'object' && rf !== null);
                return { ok: r.every(Boolean), count: r.length };
              });
            });
          });
        });
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(anR, 'analytics.js');

    // --- 10. PLANNER + COMPOSER ---
    console.log('\n10. planner.js + composer.js unit tests');
    const planR = await page.evaluate(() => {
      return Promise.all([
        import('/src/learning/planner.js'),
        import('/src/learning/composer.js'),
      ]).then(([pl, co]) => {
        const r = [];
        r.push(typeof pl.LearningPlanner === 'function');
        const planner = new pl.LearningPlanner();
        r.push(typeof planner.init === 'function');
        r.push(typeof planner.createPlan === 'function');
        r.push(typeof co.SessionComposer === 'function');
        const composer = new co.SessionComposer(planner);
        r.push(typeof composer.buildSession === 'function');
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(planR, 'planner + composer');

    // --- 11. COACH + PATTERNS ---
    console.log('\n11. coach.js + patterns.js unit tests');
    const coachR = await page.evaluate(() => {
      return Promise.all([
        import('/src/learning/coach.js'),
        import('/src/learning/patterns.js'),
      ]).then(([co, pa]) => {
        const r = [];
        r.push(typeof co.generateDailyReport === 'function');
        r.push(typeof co.generateWeeklyReport === 'function');
        r.push(typeof pa.detectPatterns === 'function');
        return co.generateDailyReport().then(report => {
          r.push(report === null || typeof report === 'object');
          return { ok: r.every(Boolean), count: r.length };
        });
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(coachR, 'coach + patterns');

    // --- 12. RECOMMENDER ---
    console.log('\n12. recommender.js unit tests');
    const recR = await page.evaluate(() => {
      return import('/src/learning/recommender.js').then(mod => {
        const r = [];
        r.push(typeof mod.computeEKG === 'function');
        r.push(typeof mod.rankQuestionsByEKG === 'function');
        r.push(typeof mod.getRecommendedFocus === 'function');
        r.push(typeof mod.getCuriosityRecommendation === 'function');
        r.push(typeof mod.getConceptLinking === 'function');
        r.push(typeof mod.getAutoFlashcards === 'function');
        return mod.getCuriosityRecommendation('h001').then(rec => {
          r.push(rec === null || typeof rec === 'object');
          return mod.getRecommendedFocus().then(focus => {
            r.push(Array.isArray(focus) || focus === null || typeof focus === 'object');
            return { ok: r.every(Boolean), count: r.length };
          });
        });
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(recR, 'recommender.js');

    // --- 13. PROFILE EDGE CASES ---
    console.log('\n13. profile.js edge cases');
    const profR = await page.evaluate(() => {
      return import('/src/learning/profile.js').then(mod => {
        const r = [];
        const p0 = { domains: {}, skills: {} };
        r.push(Array.isArray(mod.getWeakestSkills(p0, 5)) && mod.getWeakestSkills(p0, 5).length === 0);
        r.push(Array.isArray(mod.getPredictiveWeaknesses(p0)));
        r.push(mod.getDueReviews(p0).length === 0);
        const nr = mod.computeNextReview(null);
        r.push(typeof nr === 'number');
        const p1 = { domains: {}, skills: {} };
        const ts = mod.ensureTopicSkill(p1, 'hi_synonym', 'synonym');
        r.push(typeof ts === 'object');
        const p2 = { domains: { hindi: { mastery: 0.8, attempts: 5 }, english: { mastery: 0.6, attempts: 3 } }, skills: { inference: { mastery: 0.7, attempts: 10 } } };
        r.push(Array.isArray(mod.getWeakestSkills(p2, 2)));
        const ps = mod.predictScore(p2);
        r.push(ps === null || typeof ps === 'number');
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(profR, 'profile edge cases');

    await browser.close();
  } catch (err) {
    fail(`Fatal error: ${err.message}`);
    console.error(err.stack?.slice(0, 400));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  console.log('\n=== Suite 4 Complete ===');
  const total = passed + failed;
  console.log(`  ${passed}/${total} passed, ${failed} failed`);
  if (errors.length) {
    console.log(`\n  Console errors (${errors.length}):`);
    errors.slice(0, 5).forEach(e => console.log(`    ${e.slice(0, 150)}`));
  }

  writeFileSync(RESULTS_FILE, JSON.stringify({
    passed, failed, errors: errors.slice(0, 20),
    timestamp: new Date().toISOString(),
  }, null, 2));

  process.exit(failed > 0 ? 1 : 0);
})();
