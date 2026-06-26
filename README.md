# SSC JHT Quiz

Adaptive quiz app for SSC Combined Hindi Translator Paper 1.

## Live app

**https://YOUR_USERNAME.github.io/ssc-jht-quiz/**

Replace `your-github-username` with your GitHub username after the first deploy completes.

Open the link on any phone, tablet, or desktop — no install or dev server required. Progress is saved locally in your browser (IndexedDB) and works offline after the first visit.

## One-time GitHub setup

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main` (or merge a PR). The deploy workflow runs automatically.
4. When the workflow finishes, your live URL appears under **Settings → Pages**.

Optional: add a custom domain in Pages settings and a `public/CNAME` file.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build (same as CI)

```bash
# Local preview at /
npm run build
npm run preview

# GitHub Pages build (assets under /ssc-jht-quiz/)
GITHUB_PAGES=true npm run build
```

## Features

- Quick Quiz, Full Mock Test, Topic Practice, Review Mistakes
- Offline-first; optional Cloudflare AI explanations and Supabase sync via Settings
