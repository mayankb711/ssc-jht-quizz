# Agent notes — SSC JHT Quiz

## Dev commands

```bash
# Dev server
npx vite --port 5173 --host 0.0.0.0

# Build
npx vite build

# Individual test suites (need Vite server running on :5173)
node test/browser-test.mjs    # Suite 1: 30 integration + routing tests
node test/suite2.mjs          # Suite 2: 19 unit + edge cases + security + a11y
node test/suite3.mjs          # Suite 3: core + data + store + domain + shared unit tests
node test/suite4.mjs          # Suite 4: learning module unit tests (goals, explain, graph, memory, etc.)
node test/suite5.mjs          # Suite 5: integration smoke/regression (build, cross-nav, backup, diagnostics)

# Run ALL suites sequentially (starts Vite, runs 1-5, cleans up)
test\run-all.bat

# Legacy: single suite runner (suite 1 + suite 2 only)
test\run.bat
```

## Test outputs

- `test/screenshots/` — screenshots from browser tests (01-home.png through 08-mobile.png)
- `test/results.json` — suite 1 results
- `test/results2.json` — suite 2 results
- `test/results3.json` — suite 3 results
- `test/results4.json` — suite 4 results
- `test/results5.json` — suite 5 results

## Test suite summary

| Suite | File | Tests | What it covers |
|-------|------|-------|----------------|
| 1 | `browser-test.mjs` | 30 | Integration: home, quiz flow, review, progress, settings, hash routing |
| 2 | `suite2.mjs` | 19 | Unit: quizReducer, paperAnalysis, scoreSession, profile. Security, a11y, edge cases, keyboard, responsive |
| 3 | `suite3.mjs` | ~80 | Core: error.js (AppError, serialize, format), backup.js, mocktest.js. Data: questions.js, topics.js. Shared: events.js, validate.js, ui.js. Domain: entities.js. Config: app.js. Store: local.js IndexedDB CRUD |
| 4 | `suite4.mjs` | ~60 | Learning: goals.js, explain.js, skills.js, state.js, questionBank.js, graph.js, memory.js, velocity.js, analytics.js, planner.js, composer.js, coach.js, patterns.js, recommender.js, profile edge cases |
| 5 | `suite5.mjs` | ~30 | Smoke: build integrity, cross-navigation, diagnostics, bookmark, error boundary, session storage, firebase/AI/cloud module exports, visual regression, mobile |

## App structure

- `src/main.js` — entry + hash router (home/quiz/review/settings/progress/diagnostics)
- `src/ui/*.js` — screen renderers (all use topbar + innerHTML pattern)
- `src/core/*.js` — engine, progress, error handling, backup
- `src/learning/*.js` — profile, analytics, velocity, patterns, paperAnalysis, explain, etc.
- `src/store/local.js` — IndexedDB wrapper (stores: kv, attempts, cache, generated_questions)
- `src/store/cloud.js` — cloud coordinator (delegates to firebase.js)
- `src/store/firebase.js` — Firebase Firestore REST API (device-ID based, no SDK)
- `src/features/quiz/session.js` — quizReducer (legacy) + createStateMachineFromLegacy
- `src/application/quiz/state-machine.js` — QuizStateMachine class (new, currently unused except via legacy bridge)

## Firebase

- Project: `ssc-jht-quiz`, API key: `AIzaSyB74X6QREV5N8XUtBpYATSWNw390iGA2ZM`
- Hardcoded in `src/config/firebase.js`, auto-saved to IndexedDB on first configure()
- Device-ID auth stored in IndexedDB key `firebase_device_id`
- Firestore REST API: `POST/PATCH https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/users/{deviceId}?key={apiKey}`

## Known minor issues

1. No favicon.ico — browser auto-requests `/favicon.ico` and gets 404 (cosmetic)
2. `manifest.json` has inline SVG data URIs for icons — works but not ideal for all browsers
3. 4 Vite warnings about mixed static+dynamic imports (non-blocking, all modules bundled into single chunk ~197 KB / 62 KB gzip)
4. `getPaperInformedRecommendations()` and `getExamStrategy()` are exported but unused by UI
5. `createStateMachineFromLegacy()` and `convertToLegacyState()` are dead code (legacy bridge to unused state-machine.js)
6. `_recordMutex` in firebase.js is NOT shared with `push()` — rare race if manual push + auto-save happen concurrently
7. Session data overwritten on each finish (single `lastSession`/`lastMock` slot in sessionStorage)

## Testing results (latest)

**Suite 1 (browser-test.mjs): 30/30 passed**
- App load, home screen, quick quiz flow, complete session, review screen, explanations, back to home, progress, settings, hash routing, fallback routing

**Suite 2 (suite2.mjs): 19/19 passed**
- Unit: quizReducer (11 assertions), paperAnalysis (18 assertions), scoreSession (8 assertions), profile helpers (14 assertions)
- Security: no secrets in sessionStorage, Firebase key not in DOM, all innerHTML uses esc()
- Accessibility: no unlabeled inputs, no empty buttons, base font >= 12px
- Edge cases: empty review state, empty progress state, rapid clicks (50ms intervals), mobile viewport (375×667), keyboard nav (1-4 selects, R checks, B bookmarks, Space advances)
