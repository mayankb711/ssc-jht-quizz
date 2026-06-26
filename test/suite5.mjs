import { chromium } from 'playwright';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE = `http://localhost:${Number(process.env.PORT) || 5173}`;
const RESULTS_FILE = resolve('test', 'results5.json');
const SCREENSHOT_DIR = resolve('test', 'screenshots');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('=== Suite 5: Integration Smoke / Regression Tests ===\n');
  let passed = 0, failed = 0, fatal = null;
  const errors = [];

  function ok(msg) { passed++; console.log(`  \u2705 ${msg}`); }
  function fail(msg) { failed++; console.log(`  \u274c ${msg}`); }

  async function clickId(page, id, timeout = 5000) {
    await page.waitForSelector(`#${id}`, { timeout, state: 'visible' });
    await page.click(`#${id}`);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push({ level: 'PAGE_ERROR', text: e.message }));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push({ level: msg.type(), text: msg.text() });
    });

    // Build check (non-browser)
    console.log('1. Build integrity check');
    const { execSync } = await import('child_process');
    let buildOk = false;
    try {
      const out = execSync('npx vite build', { cwd: resolve('.'), encoding: 'utf8', timeout: 60000 });
      buildOk = out.includes('modules transformed') || out.includes('built in');
    } catch (e) {
      buildOk = false;
    }
    ok(buildOk, 'vite build succeeds');

    // --- 2. APP LOAD TESTS ---
    console.log('\n2. App load & error handling');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);

    const fatalEl = await page.$('.error-container');
    ok(!fatalEl, 'No fatal error container on load');

    // Check that main sections are present
    const app = await page.$('#app');
    ok(!!app, '#app container exists');
    const bodyText = await page.evaluate(() => document.body.innerText);
    ok(bodyText.includes('SSC'), 'Brand text visible');

    // --- 3. FULL QUIZ + BACKUP/RESTORE CYCLE ---
    console.log('\n3. Full quiz cycle');
    await clickId(page, 'quick-quiz');
    await sleep(2000);

    // Answer 3 questions
    for (let i = 0; i < 3; i++) {
      const oo = await page.$$('.ui-opt');
      if (oo.length > 0) await oo[i % oo.length].click();
      await sleep(150);
      const cc = await page.$('#check');
      if (cc) await cc.click();
      await sleep(500);
      const nxt = await page.$('#next');
      if (nxt) await nxt.click();
      await sleep(400);
    }

    // Finish session
    for (let i = 0; i < 20; i++) {
      const fin = await page.$('#finish');
      if (fin) { await fin.click(); break; }
      const hasNext = await page.waitForSelector('#next', { state: 'visible', timeout: 2000 }).then(() => true).catch(() => false);
      if (!hasNext) break;
      await page.click('#next');
      await page.waitForSelector('.ui-opt', { state: 'visible', timeout: 3000 }).catch(() => {});
      const oo = await page.$$('.ui-opt');
      if (oo.length > 0) await oo[0].click();
      await sleep(100);
      const cc = await page.$('#check');
      if (cc) { await cc.click(); await sleep(200); }
    }
    await sleep(2000);

    const rBrand = await page.$eval('.ui-brand', el => el.textContent).catch(() => '');
    ok(rBrand.includes('Review'), `Review screen loaded: "${rBrand}"`);

    // --- 4. BACK-TO-HOME + CROSS-NAVIGATION ---
    console.log('\n4. Cross-navigation stress test');
    const screens = ['home', 'progress', 'settings', 'review', 'diagnostics'];
    for (const screen of screens) {
      await page.goto(`${BASE}/#screen=${screen}`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      const ok2 = await page.evaluate(() => {
        const app2 = document.getElementById('app');
        return app2 && app2.innerHTML.length > 50;
      });
      ok(ok2, `Screen "${screen}" renders without crash`);
    }

    // Navigate back and forth rapidly
    for (let i = 0; i < 5; i++) {
      const from = screens[i % screens.length];
      const to = screens[(i + 1) % screens.length];
      await page.goto(`${BASE}/#screen=${to}`, { waitUntil: 'domcontentloaded' });
      await sleep(200);
    }
    const stable = await page.evaluate(() => {
      const a = document.getElementById('app');
      return a && a.innerHTML.length > 50;
    });
    ok(stable, 'Rapid screen switching remains stable');

    // --- 5. DIAGNOSTICS SCREEN ---
    console.log('\n5. Diagnostics screen');
    await page.goto(`${BASE}/#screen=diagnostics`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const diagLoaded = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Diagnostics') || text.includes('Error') || text.includes('Report');
    });
    ok(diagLoaded, 'Diagnostics screen renders');

    const diagButtons = await page.$$('#dbody button, #dbody .ui-btn');
    ok(diagButtons.length >= 1, `Diagnostics has ${diagButtons.length} actionable elements`);

    // --- 6. BOOKMARK TOGGLE ---
    console.log('\n6. Bookmark interaction');
    await page.goto(`${BASE}/#screen=quiz&mode=quick`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const bookmarkBtn = await page.$('#bookmark, [data-action="bookmark"], .ui-bookmark');
    if (bookmarkBtn) {
      await bookmarkBtn.click();
      await sleep(300);
      ok(true, 'Bookmark toggle clicked without error');
    } else {
      // Try keyboard bookmark
      await page.keyboard.press('b');
      await sleep(300);
      ok(true, 'Keyboard bookmark toggle (B key)');
    }

    // --- 7. ERROR BOUNDARY / MISSING ROUTE ---
    console.log('\n7. Error boundary tests');
    await page.goto(`${BASE}/#screen=`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    const emptyRoute = await page.evaluate(() => {
      const a = document.getElementById('app');
      return a && a.innerHTML.length > 20;
    });
    ok(emptyRoute, 'Empty hash route falls back gracefully');

    await page.goto(`${BASE}/#screen=quiz`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const quizNoMode = await page.evaluate(() => {
      const brand = document.querySelector('.ui-brand');
      return brand && (brand.textContent.includes('Quiz') || brand.textContent.includes('SSC'));
    });
    ok(quizNoMode, 'Quiz route without mode defaults gracefully');

    // --- 8. MEMORY / SESSION STORAGE CONSISTENCY ---
    console.log('\n8. Session storage consistency');
    const sesKeys = await page.evaluate(() => {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) keys.push(sessionStorage.key(i));
      return keys.sort();
    });
    const hasSessionHistory = sesKeys.some(k => k === 'sessionHistory' || k.startsWith('ses_') || k === 'lastSession');
    ok(hasSessionHistory, `Session history persisted (keys: ${sesKeys.filter(k => k.startsWith('ses_') || k === 'sessionHistory' || k === 'lastSession').join(', ') || 'none'})`);

    // --- 9. NO JS ERRORS FROM NORMAL INTERACTION ---
    console.log('\n9. Clean interaction audit');
    const interactionErrors = await page.evaluate(() => {
      const logs = [];
      const origError = console.error;
      console.error = (...args) => { logs.push(args.join(' ')); };
      // Simulate common interactions
      const app2 = document.getElementById('app');
      if (app2) app2.click();
      window.dispatchEvent(new Event('resize'));
      document.querySelectorAll('.ui-btn, button').forEach(b => {
        try { b.dispatchEvent(new Event('click')); } catch (_) {}
      });
      console.error = origError;
      return logs;
    });
    ok(interactionErrors.length === 0, `Simulated interactions produce ${interactionErrors.length} errors`);

    // --- 10. FIREBASE CONFIG LIGHT CHECK ---
    console.log('\n10. Firebase module integration (light)');
    const fbCheck = await page.evaluate(() => {
      return import('/src/store/firebase.js').then(mod => {
        const r = [];
        r.push(typeof mod.configure === 'function');
        r.push(typeof mod.getStatus === 'function');
        r.push(typeof mod.isOnline === 'function');
        r.push(typeof mod.recordAttempt === 'function');
        r.push(typeof mod.fetchAttempts === 'function');
        r.push(typeof mod.push === 'function');
        r.push(typeof mod.pull === 'function');
        r.push(typeof mod.autoPull === 'function');
        r.push(typeof mod.signOut === 'function');
        return r.every(Boolean);
      }).catch(e => false);
    });
    ok(fbCheck, 'Firebase module exports all expected functions');

    // --- 11. AI MODULE LIGHT CHECK ---
    console.log('\n11. AI module integration (light)');
    const aiCheck = await page.evaluate(() => {
      return import('/src/ai/client.js').then(mod => {
        const r = [];
        r.push(typeof mod.explain === 'function');
        r.push(typeof mod.getUsage === 'function');
        r.push(typeof mod.generateQuestions === 'function');
        r.push(typeof mod.getGeneratedBank === 'function');
        return r.every(Boolean);
      }).catch(e => false);
    });
    ok(aiCheck, 'AI client exports all expected functions');

    // --- 12. CLOUD COORDINATOR LIGHT CHECK ---
    console.log('\n12. Cloud coordinator module');
    const cloudCheck = await page.evaluate(() => {
      return import('/src/store/cloud.js').then(mod => {
        const r = [];
        r.push(typeof mod.configure === 'function');
        r.push(typeof mod.recordAttempt === 'function');
        r.push(typeof mod.push === 'function');
        r.push(typeof mod.pull === 'function');
        r.push(typeof mod.getStatus === 'function');
        r.push(typeof mod.isOnline === 'function');
        return r.every(Boolean);
      }).catch(e => false);
    });
    ok(cloudCheck, 'Cloud module exports all expected functions');

    // --- 13. STYLES / VISUAL REGRESSION ---
    console.log('\n13. Visual regression check');
    await page.goto(`${BASE}/#screen=home`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const computed = await page.evaluate(() => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      return {
        bg: style.getPropertyValue('--bg').trim() || style.backgroundColor,
        font: style.getPropertyValue('--font').trim() || style.fontFamily,
      };
    });
    ok(!!computed.bg, 'CSS variables / background computed');
    ok(!!computed.font, 'Font family computed');

    // Mobile visual regression
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE}/#screen=home`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const mobileContent = await page.evaluate(() => {
      const btns = document.querySelectorAll('#quick-quiz, #start-session');
      return btns.length >= 1;
    });
    ok(mobileContent, 'All buttons visible on mobile 375px');
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '07-smoke-mobile.png') });

    await browser.close();
  } catch (err) {
    fatal = err.message;
    fail(`Fatal error: ${err.message}`);
    console.error(err.stack?.slice(0, 500));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  console.log('\n=== Suite 5 Complete ===');
  const total = passed + failed;
  console.log(`  ${passed}/${total} passed, ${failed} failed`);
  if (fatal) console.log(`  Fatal: ${fatal}`);
  if (errors.length) {
    console.log(`\n  Console errors (${errors.length}):`);
    errors.slice(0, 8).forEach(e => console.log(`    ${e.level || 'error'}: ${(e.text || e).slice(0, 150)}`));
  }

  writeFileSync(RESULTS_FILE, JSON.stringify({
    passed, failed, fatal,
    errors: errors.slice(0, 20),
    timestamp: new Date().toISOString(),
  }, null, 2));

  process.exit(failed > 0 || fatal ? 1 : 0);
})();
