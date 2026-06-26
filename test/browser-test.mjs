import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE = `http://localhost:${Number(process.env.PORT) || 5173}`;
const SCREENSHOT_DIR = resolve('test', 'screenshots');
const RESULTS_FILE = resolve('test', 'results.json');

if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('=== SSC JHT Quiz — Headless Browser Test ===\n');
  console.log(`  Target: ${BASE}\n`);

  let passed = 0, failed = 0, fatal = null;
  const errors = [];

  function ok(msg) { passed++; console.log(`  ✅ ${msg}`); }
  function fail(msg) { failed++; console.log(`  ❌ ${msg}`); }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();

    page.on('pageerror', err => errors.push({ level: 'PAGE_ERROR', text: err.message }));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push({ level: msg.type(), text: msg.text() });
    });

    // Helper: wait for element and click
    async function clickId(id, timeout = 5000) {
      await page.waitForSelector(`#${id}`, { timeout, state: 'visible' });
      await page.click(`#${id}`);
    }

    // 1. Load app
    console.log('1. App load & home screen');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);

    const errContainer = await page.$('.error-container');
    if (errContainer) { fatal = 'Fatal error on load'; fail(fatal); }
    else ok('App loaded without fatal error');

    const brand = await page.$eval('.ui-brand', el => el.textContent).catch(() => '');
    ok(brand.includes('SSC JHT Quiz'), `Brand: "${brand}"`);
    ok(!!(await page.$('#quick-quiz')), 'Quick Quiz button');
    ok(!!(await page.$('#start-session')), 'Start Session button');
    const navs = await page.$$('.ui-nav-btn');
    ok(navs.length >= 2, `Nav buttons (${navs.length})`);
    ok(!!(await page.$('[data-mode="mock"]')), 'Mock Test button');

    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '01-home.png') });

    // 2. Quick quiz
    console.log('\n2. Quick quiz flow');
    await clickId('quick-quiz');
    await sleep(2000);

    const qBrand = await page.$eval('.ui-brand', el => el.textContent).catch(() => '');
    ok(qBrand.includes('Quiz'), `Quiz loaded: "${qBrand}"`);

    const opts0 = await page.$$('.ui-opt');
    ok(opts0.length >= 2, `Options (${opts0.length})`);
    ok(!!(await page.$('.ui-stem')), 'Question stem');
    ok(!!(await page.$('.ui-progress__count')), 'Progress counter');

    await opts0[0].click();
    await sleep(200);
    ok(!!(await page.$('.ui-opt--selected')), 'Option selection');

    ok(!!(await page.$('#check')), 'Check button appeared');
    await clickId('check');
    await sleep(1500);

    const fbText = await page.$eval('#feedback', el => el.textContent).catch(() => '');
    ok(fbText.includes('Correct') || fbText.includes('Wrong'), `Feedback shown`);

    ok(!!(await page.$('#next')), 'Next button');
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '02-quiz-answer.png') });

    // 3. Complete quiz (answer a few, then finish)
    console.log('\n3. Complete quiz');
    for (let i = 0; i < 3; i++) {
      await clickId('next');
      await sleep(400);
      const oo = await page.$$('.ui-opt');
      if (oo.length > 0) await oo[i % oo.length].click();
      await sleep(150);
      const cc = await page.$('#check');
      if (cc) await cc.click();
      await sleep(300);
    }

    // Navigate to finish button (wait-for-selector to handle re-renders)
    for (let i = 0; i < 20; i++) {
      const fin = await page.$('#finish');
      if (fin) { await fin.click(); break; }
      const nxt = await page.waitForSelector('#next', { state: 'visible', timeout: 3000 }).catch(() => null);
      if (!nxt) break;
      await nxt.click();
      await page.waitForSelector('.ui-opt', { state: 'visible', timeout: 3000 }).catch(() => {});
      const oo = await page.$$('.ui-opt');
      if (oo.length > 0) await oo[0].click();
      await sleep(100);
      const cc = await page.$('#check');
      if (cc) { await cc.click(); await sleep(200); }
    }
    await sleep(2000);

    const rBrand = await page.$eval('.ui-brand', el => el.textContent).catch(() => '');
    ok(rBrand.includes('Review'), `Review loaded: "${rBrand}"`);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '03-review.png') });

    // 4. Review screen
    console.log('\n4. Review checks');
    ok(!!(await page.$('#review-list')), 'Review list');
    ok(!!(await page.$('#back-home')), 'Back to Home button');

    const toggles = await page.$$('[data-toggle]');
    if (toggles.length > 0) {
      await toggles[0].click();
      await sleep(1500);
      const rc = await page.$('.review-teach');
      const vis = rc ? await rc.isVisible() : false;
      ok(vis, 'Explanation expandable');
      await page.screenshot({ path: resolve(SCREENSHOT_DIR, '04-review-explain.png') });
    }

    await clickId('back-home');
    await sleep(1500);
    ok((await page.$eval('.ui-brand', el => el.textContent.includes('SSC JHT Quiz')).catch(() => false)), 'Back home');

    // 5. Progress screen
    console.log('\n5. Progress screen');
    const pNav = await page.$('[data-go="progress"]');
    if (pNav) {
      await pNav.click();
      await sleep(2000);
      ok(!!(await page.$('#pbody')), 'Progress loaded');
      await page.screenshot({ path: resolve(SCREENSHOT_DIR, '05-progress.png') });
    }

    // 6. Settings screen
    console.log('\n6. Settings screen');
    const sNav = await page.$('[data-go="settings"]');
    if (sNav) {
      await sNav.click();
      await sleep(2000);
      ok(!!(await page.$('#sbody')), 'Settings loaded');
      ok(!!(await page.$('#theme')), 'Theme selector');
      ok(!!(await page.$('#cf_account')), 'AI Account field');
      ok(!!(await page.$('#daily_goal')), 'Daily goal field');
      ok(!!(await page.$('#backup')), 'Backup button');
      ok(!!(await page.$('#fb-status')), 'Firebase status');
      await page.screenshot({ path: resolve(SCREENSHOT_DIR, '06-settings.png') });
    }

    // 7. Hash routing
    console.log('\n7. Hash routing');
    await page.goto(`${BASE}/#screen=home`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    ok((await page.$eval('.ui-brand', el => el.textContent.includes('SSC JHT Quiz')).catch(() => false)), 'Hash: home');

    await page.goto(`${BASE}/#screen=settings`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    ok((await page.$eval('.ui-brand', el => el.textContent.includes('Settings')).catch(() => false)), 'Hash: settings');

    await page.goto(`${BASE}/#screen=quiz&mode=quick`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    ok((await page.$eval('.ui-brand', el => el.textContent.includes('Quiz')).catch(() => false)), 'Hash: quiz');

    await page.goto(`${BASE}/#screen=nonexistent`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    ok((await page.$eval('.ui-brand', el => el.textContent.includes('SSC JHT Quiz')).catch(() => false)), 'Fallback to home');

    await browser.close();
  } catch (err) {
    fatal = err.message;
    fail(`Script error: ${err.message}`);
    console.error(err.stack?.slice(0, 500));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  console.log('\n=== Complete ===');
  const total = passed + failed;
  console.log(`  ${passed}/${total} passed, ${failed} failed`);
  if (fatal) console.log(`  Fatal: ${fatal}`);
  if (errors.length) {
    console.log(`\n  Console errors (${errors.length}):`);
    errors.slice(0, 8).forEach(e => console.log(`    ${e.level}: ${e.text.slice(0, 200)}`));
    if (errors.length > 8) console.log(`    ... +${errors.length - 8} more`);
  }

  writeFileSync(RESULTS_FILE, JSON.stringify({
    passed, failed, fatal,
    errors: errors.slice(0, 20),
    timestamp: new Date().toISOString(),
  }, null, 2));

  process.exit(failed > 0 || fatal ? 1 : 0);
})();
