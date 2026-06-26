import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE = `http://localhost:${Number(process.env.PORT) || 5173}`;
const RESULTS_FILE = resolve('test', 'results3.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('=== Suite 3: Core + Data + Store + Domain + Shared Unit Tests ===\n');
  let passed = 0, failed = 0;
  const errors = [];
  const details = [];

  function ok(msg) { passed++; console.log(`  \u2705 ${msg}`); }
  function fail(msg) { failed++; console.log(`  \u274c ${msg}`); }
  function check(result, label, extra = '') {
    if (result.ok) return ok(`${label} (${result.count} assertions)`);
    const hint = extra || result.error || '';
    fail(`${label} — FAILED ${result.count} total assertions${hint ? ' — ' + hint : ''}`);
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

    // --- 1. CORE MODULE TESTS ---
    console.log('1. Core module unit tests');

    const appErrR = await page.evaluate(() => {
      return import('/src/core/error.js').then(mod => {
        const r = [];
        const err = new mod.AppError('test error', { file: 'test.js', func: 'testFunc', source: 'test', action: 'unit test', context: { key: 'val' } });
        r.push(err instanceof Error);
        r.push(err.message === 'test error');
        r.push(err.file === 'test.js');
        r.push(err.func === 'testFunc');
        r.push(err.source === 'test');
        r.push(err.action === 'unit test');
        r.push(typeof err.id === 'string' && err.id.startsWith('err_'));
        r.push(typeof err.timestamp === 'number');
        r.push(err.name === 'AppError');
        r.push(Array.isArray(err.recovery));
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(appErrR, 'AppError');

    const serR = await page.evaluate(() => {
      return import('/src/core/error.js').then(mod => {
        const r = [];
        const appErr = new mod.AppError('msg', { file: 'f', func: 'fn', source: 's', action: 'a', context: { x: 1 } });
        const s1 = mod.serializeError(appErr);
        r.push(s1.title === 'AppError');
        r.push(s1.message === 'msg');
        r.push(s1.file === 'f');
        r.push(s1.func === 'fn');
        r.push(s1.source === 's');
        r.push(Array.isArray(s1.recoverySteps));
        r.push(typeof s1.url === 'string');
        r.push(s1.resolved === false);
        const s2 = mod.serializeError(new Error('plain'), { file: 'x.js' });
        r.push(s2.title === 'Runtime error');
        r.push(s2.file === 'x.js');
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(serR, 'serializeError');

    const fmtR = await page.evaluate(() => {
      return import('/src/core/error.js').then(mod => {
        const r = [];
        const fmt = mod.formatErrorForDisplay({ title: 'Err', message: 'msg', file: 'f', func: 'fn', action: 'a', source: 's', ts: 1700000000000, recoverySteps: ['Step 1'] });
        r.push(typeof fmt === 'string' && fmt.length > 0);
        r.push(fmt.includes('Err'));
        r.push(fmt.includes('msg'));
        r.push(fmt.includes('at fn (f)'));
        r.push(fmt.includes('during: a'));
        r.push(fmt.includes('source: s'));
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(fmtR, 'formatErrorForDisplay');

    const boundR = await page.evaluate(() => {
      return import('/src/core/error.js').then(mod => {
        const r = [];
        const fn1 = mod.withErrorBoundarySync(() => 'ok', { rethrow: false });
        r.push(fn1() === 'ok');
        const fn2 = mod.withErrorBoundarySync(() => { throw new Error('sync err'); }, { rethrow: false });
        const result2 = fn2();
        r.push(result2 === undefined);
        const fn3 = mod.withErrorBoundarySync(() => { throw new Error('fb'); }, { fallback: (e) => 'recovered', rethrow: false });
        r.push(fn3() === 'recovered');
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(boundR, 'withErrorBoundarySync');

    const mockR = await page.evaluate(() => {
      return import('/src/core/mocktest.js').then(mod => {
        const r = [];
        r.push(mod.MOCK.count === 200);
        r.push(mod.MOCK.durationMs === 7200000);
        r.push(mod.MOCK.negative === 0.25);
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(mockR, 'MOCK constants');

    const bkpR = await page.evaluate(() => {
      return import('/src/core/backup.js').then(mod => {
        return mod.exportBackupPayload().then(payload => {
          const r = [];
          r.push(typeof payload === 'object');
          r.push(payload.v === 2);
          r.push(typeof payload.exportedAt === 'string');
          r.push(Array.isArray(payload.attempts));
          r.push(Array.isArray(payload.generatedQuestions));
          r.push(Array.isArray(payload.errorReports));
          r.push(typeof payload.settings === 'object');
          return { ok: r.every(Boolean), count: r.length };
        });
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(bkpR, 'exportBackupPayload structure');

    // --- 2. DATA MODULE TESTS ---
    console.log('\n2. Data module unit tests');

    const dataR = await page.evaluate(() => {
      return Promise.all([
        import('/src/data/questions.js'),
        import('/src/data/topics.js'),
      ]).then(([qs, tp]) => {
        const r = [];
        r.push(Array.isArray(qs.QUESTIONS));
        r.push(qs.QUESTIONS.length >= 60);
        const q = qs.questionById('h001');
        r.push(!!q && q.id === 'h001');
        r.push(q.topic === 'hi_comprehension');
        r.push(qs.questionById('nonexistent') === undefined);
        const hiQs = qs.questionsBySubject('hi');
        r.push(hiQs.length > 0);
        r.push(hiQs.every(x => x.lang === 'hi'));
        const enQs = qs.questionsBySubject('en');
        r.push(enQs.length > 0);
        r.push(enQs.every(x => x.lang === 'en'));
        const compQs = qs.questionsByTopic('hi_comprehension');
        r.push(compQs.length >= 4);
        r.push(compQs.every(x => x.topic === 'hi_comprehension'));
        r.push(typeof tp.SUBJECTS === 'object');
        r.push(tp.SUBJECTS.hi.label.includes('Hindi'));
        r.push(tp.SUBJECTS.en.label.includes('English'));
        r.push(Array.isArray(tp.TOPICS));
        r.push(tp.TOPICS.length >= 16);
        r.push(tp.TOPIC_SHARE.hi_comprehension === 20);
        r.push(tp.TOPIC_SHARE.en_reading === 15);
        const t = tp.topicById('hi_synonym');
        r.push(!!t && t.subject === 'hi');
        r.push(t.share === 12);
        r.push(Array.isArray(t.skills));
        r.push(tp.topicById('zzz') === undefined);
        const hiTp = tp.topicsBySubject('hi');
        r.push(hiTp.every(x => x.subject === 'hi'));
        const enTp = tp.topicsBySubject('en');
        r.push(enTp.every(x => x.subject === 'en'));
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(dataR, 'Questions + Topics');

    // --- 3. SHARED MODULE TESTS ---
    console.log('\n3. Shared module unit tests');

    const valR = await page.evaluate(() => {
      return import('/src/shared/validate.js').then(mod => {
        const r = [];
        r.push(mod.asString('hello') === 'hello');
        r.push(mod.asString(42) === '');
        r.push(mod.asString(null, 'default') === 'default');
        r.push(mod.asNumber(5) === 5);
        r.push(mod.asNumber('3') === 3);
        r.push(mod.asNumber('abc') === 0);
        r.push(mod.asNumber(null, 10) === 0);
        r.push(mod.asNumber(Infinity) === 0);
        const vq = { id: 'x', topic: 'y', options: ['a','b','c','d'] };
        r.push(mod.isQuestionShape(vq) === true);
        r.push(mod.isQuestionShape(null) === false);
        r.push(mod.isQuestionShape({}) === false);
        r.push(mod.isQuestionShape({ id: 'x', topic: 'y', options: ['a','b'] }) === false);
        r.push(mod.normalizeList([1, null, 2, undefined, 3]).length === 3);
        r.push(mod.normalizeList(null).length === 0);
        r.push(mod.normalizeList('not array').length === 0);
        r.push(mod.assertObject({}, 'test') !== undefined);
        try { mod.assertObject(null, 'test'); r.push(false); } catch (e) { r.push(true); }
        return { ok: r.every(Boolean), count: r.length, values: r };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(valR, 'validate.js');
    if (!valR.ok && valR.values) {
      const labels = ['asString(hello)', 'asString(42)', 'asString(null,default)', 'asNumber(5)', "asNumber('3')", "asNumber('abc')", 'asNumber(null,10)', 'asNumber(Infinity)', 'isQuestionShape(valid)', 'isQuestionShape(null)', 'isQuestionShape({})', 'isQuestionShape(short)', 'normalizeList', 'normalizeList(null)', 'normalizeList(string)', 'assertObject(valid)', 'assertObject(null)'];
      valR.values.forEach((v, i) => { if (!v) console.log(`  [${i}] ${labels[i]} FAILED`); });
    }

    const evtR = await page.evaluate(() => {
      return import('/src/shared/events.js').then(mod => {
        const r = [];
        r.push(typeof mod.DomainEvents === 'object');
        r.push(mod.DomainEvents.QUIZ_STARTED === 'quiz.started');
        r.push(mod.DomainEvents.ATTEMPT_RECORDED === 'attempt.recorded');
        let called = false;
        const unsub = mod.on('evt.test', (p) => { called = p; });
        mod.emit('evt.test', 'hello');
        r.push(called === 'hello');
        unsub();
        called = false;
        mod.emit('evt.test', 'world');
        r.push(called === false);
        let onceCount = 0;
        mod.once('evt.once', () => { onceCount++; });
        mod.emit('evt.once', 'a');
        mod.emit('evt.once', 'b');
        r.push(onceCount === 1);
        let clearedCall = false;
        mod.on('evt.clr', () => { clearedCall = true; });
        mod.clear('evt.clr');
        mod.emit('evt.clr', 'x');
        r.push(clearedCall === false);
        const hist = mod.getHistory();
        r.push(Array.isArray(hist));
        let multiA = 0, multiB = 0;
        const unsubM = mod.onMultiple({ 'evt.ma': () => multiA++, 'evt.mb': () => multiB++ });
        mod.emit('evt.ma');
        mod.emit('evt.mb');
        r.push(multiA === 1);
        r.push(multiB === 1);
        unsubM();
        const qe = mod.createDomainEmitter('quiz');
        r.push(typeof qe.emit === 'function');
        r.push(typeof qe.on === 'function');
        r.push(typeof qe.onAll === 'function');
        let qp = null;
        qe.on('custom', (p) => { qp = p; });
        qe.emit('custom', { data: 1 });
        r.push(qp?.data === 1);
        r.push(typeof mod.quizEvents === 'object');
        r.push(typeof mod.progressEvents === 'object');
        r.push(typeof mod.backupEvents === 'object');
        mod.clear();
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(evtR, 'events.js');

    // --- 4. CONFIG MODULE TESTS ---
    console.log('\n4. Config module tests');

    const cfgR = await page.evaluate(() => {
      return import('/src/config/app.js').then(mod => {
        const r = [];
        r.push(mod.VERSION.app === '2.1.0');
        r.push(mod.VERSION.db === 3);
        r.push(mod.VERSION.backup === 2);
        r.push(mod.APP.name === 'SSC JHT Quiz');
        r.push(mod.APP.defaultTheme === 'dark');
        r.push(mod.APP.defaultNeuronCap === 8000);
        r.push(mod.APP.negativeMarking === 0.25);
        r.push(mod.FEATURES.cloudSync === true);
        r.push(mod.FEATURES.aiExplanations === true);
        r.push(mod.KV_KEYS.theme === 'theme');
        r.push(mod.KV_KEYS.bookmarks === 'bookmarks');
        r.push(mod.SCREEN_LABELS.home === 'Home');
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(cfgR, 'app.js config');

    // --- 5. DOMAIN MODULE TESTS ---
    console.log('\n5. Domain entity tests');

    const domR = await page.evaluate(() => {
      return import('/src/domain/entities.js').then(mod => {
        const r = [];
        r.push(mod.SCHEMA_VERSIONS.QUESTION === 1);
        r.push(mod.SCHEMA_VERSIONS.ATTEMPT === 1);
        r.push(mod.SCHEMA_VERSIONS.SETTINGS === 1);
        r.push(mod.SCHEMA_VERSIONS.BACKUP === 2);
        r.push(mod.QuestionSchema.shape.id === 'string');
        r.push(mod.QuestionSchema.shape.answer === 'number');
        r.push(mod.AttemptSchema.shape.question_id === 'string');
        r.push(mod.AttemptSchema.shape.correct === 'boolean');
        const vq = { id: 'q1', topic: 'hi_synonym', difficulty: 3, stem: 'test?', options: ['a','b','c','d'], answer: 0, source: 'AUTHORED', lang: 'hi' };
        r.push(mod.validateEntity(vq, mod.QuestionSchema) === true);
        r.push(mod.isQuestion(vq) === true);
        try { mod.validateEntity({}, mod.QuestionSchema); r.push(false); }
        catch (e) { r.push(e.message.includes('Missing required')); }
        r.push(mod.isQuestion({}) === false);
        const va = { id: 'a1', question_id: 'q1', topic: 'hi_synonym', correct: true, ts: Date.now(), mode: 'quick' };
        r.push(mod.isAttempt(va) === true);
        r.push(mod.isAttempt({ id: 'bad' }) === false);
        const vs = { theme: 'dark', cf_model: 'model', neuron_cap: 8000 };
        r.push(mod.isSettings(vs) === true);
        r.push(mod.isSettings({ theme: 'dark' }) === false);
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(domR, 'domain entities');

    // --- 6. SHARED UI MODULE TESTS ---
    console.log('\n6. Shared UI helper tests');

    const uiR = await page.evaluate(() => {
      return import('/src/shared/ui.js').then(mod => {
        const r = [];
        r.push(typeof mod.card === 'function');
        r.push(typeof mod.badge === 'function');
        r.push(typeof mod.sectionTitle === 'function');
        r.push(typeof mod.statCard === 'function');
        r.push(typeof mod.emptyState === 'function');
        r.push(typeof mod.skeleton === 'function');
        r.push(typeof mod.progressRing === 'function');
        r.push(typeof mod.searchFilterBar === 'function');
        r.push(typeof mod.dialog === 'function');
        const b = mod.badge('hello', 'success');
        r.push(typeof b === 'string' && b.includes('hello') && b.includes('badge') && b.includes('success'));
        const c = mod.card('Title', 'Body', '<button>OK</button>');
        r.push(typeof c === 'string' && c.includes('Title') && c.includes('Body') && c.includes('OK'));
        const es = mod.emptyState('No Data', 'Nothing here', '<a>Go</a>');
        r.push(es.includes('No Data') && es.includes('Nothing here'));
        const sc = mod.statCard('Score', '85%', '+5%');
        r.push(sc.includes('Score') && sc.includes('85%'));
        const st = mod.sectionTitle('Section', 'Sub');
        r.push(st.includes('Section') && st.includes('Sub'));
        const pr = mod.progressRing(0.75);
        r.push(typeof pr === 'string' && pr.includes('75'));
        const sk = mod.skeleton(3);
        r.push(typeof sk === 'string');
        const dg = mod.dialog('Confirm', 'Sure?', '<button>Yes</button>');
        r.push(dg.includes('Confirm') && dg.includes('Sure?'));
        return { ok: r.every(Boolean), count: r.length };
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(uiR, 'shared/ui.js');

    // --- 7. LOCAL STORE INTEGRATION ---
    console.log('\n7. Local store (IndexedDB) tests');

    const storeR = await page.evaluate(() => {
      return import('/src/store/local.js').then(mod => {
        const r = [];
        return mod.kvSet('s3_k1', { v: 42 }).then(() => {
          return mod.kvGet('s3_k1', null).then(v => {
            r.push(v?.v === 42);
            return mod.kvSet('s3_k2', 'hello').then(() => {
              return mod.kvGet('s3_k2', '').then(v2 => {
                r.push(v2 === 'hello');
                return mod.kvGet('s3_nonexistent', 'default').then(v3 => {
                  r.push(v3 === 'default');
                  return mod.kvDelete('s3_k1').then(() => {
                    return mod.kvGet('s3_k1', null).then(v4 => {
                      r.push(v4 === null);
                      return mod.kvDelete('s3_k2').then(() => {
                        const a = { id: 's3_a_' + Date.now(), question_id: 'h001', topic: 'hi_comprehension', correct: true, ts: Date.now(), mode: 'quick', selected: 1 };
                        return mod.addAttempt(a).then(() => {
                          return mod.allAttempts().then(all => {
                            r.push(all.some(x => x.id === a.id));
                            return { ok: r.every(Boolean), count: r.length };
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      }).catch(e => ({ ok: false, error: e.message }));
    });
    check(storeR, 'local.js store');

    await browser.close();
  } catch (err) {
    fail(`Fatal error: ${err.message}`);
    console.error(err.stack?.slice(0, 400));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  console.log('\n=== Suite 3 Complete ===');
  const total = passed + failed;
  console.log(`  ${passed}/${total} passed, ${failed} failed`);
  if (failed > 0) {
    const r = await (await import('fs')).promises.readFile(RESULTS_FILE, 'utf8').catch(() => '{}');
    console.log(`  See ${RESULTS_FILE} for details`);
  }
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
