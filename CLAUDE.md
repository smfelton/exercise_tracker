# CLAUDE.md

This file provides guidance to Claude Code when working with this project.

## Project Overview

This is a **Progressive Web App (PWA)** built with vanilla JavaScript. It runs entirely in the browser with no backend — data is stored locally on the device using IndexedDB via Dexie.js. Specifically, it will be used from an iPhone, SE 2020 model.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no framework)
- **Database:** IndexedDB via [Dexie.js](https://dexie.org/)
- **PWA:** Web App Manifest + Service Worker
- **Hosting:** Static file hosting with GitHub Pages

## Project Structure

```
/
├── index.html          # App entry point
├── manifest.json       # PWA manifest (name, icons, theme color)
├── service-worker.js   # Service worker (required for PWA install)
├── css/
│   └── style.css
├── js/
│   ├── app.js          # Main app logic
│   ├── db.js           # Dexie.js database setup and queries
│   ├── ui.js           # DOM manipulation and rendering
│   └── vendor/
│       └── dexie.mjs   # Pinned copy of Dexie.js
└── icons/              # PWA icons (various sizes)
```

## Key Conventions

- **No build step** — plain JS files, no bundler, no transpilation
- **ES modules** — use `type="module"` in script tags and `import/export` syntax
- **No framework** — vanilla DOM manipulation only; do not introduce React, Vue, etc.
- **Async/await** — all Dexie.js database calls are async; always use await and wrap in try/catch

## Database (Dexie.js)

All database setup lives in `js/db.js`. When adding new tables or fields:

1. Increment the version number in `db.version()`
2. Define the new schema alongside existing versions (never modify old versions)
3. Export query helper functions from `db.js` rather than calling Dexie directly in other files

Example pattern:
```javascript
// js/db.js
import Dexie from './vendor/dexie.mjs'; // vendored, pinned copy (Dexie 4.0.11)

const db = new Dexie('appdb');

db.version(1).stores({
  entries: '++id, date, category'
});

export async function addEntry(entry) {
  return await db.entries.add({ ...entry, date: new Date() });
}

export async function getEntries() {
  return await db.entries.orderBy('date').reverse().toArray();
}

export default db;
```

## PWA Requirements

- `manifest.json` must be linked in `index.html` and include at minimum: `name`, `short_name`, `start_url`, `display`, `icons`
- `service-worker.js` must be registered in `index.html` and must exist (even if minimal) for the install prompt to work on iOS
- Icons should be provided at 192x192 and 512x512 at minimum

## Service Worker

The app must open offline (the gym may have no signal), so `service-worker.js` caches the app's files with a network-first strategy: it tries the site first (bypassing the browser's HTTP cache) and falls back to the saved copy when offline or after a 3-second timeout:

- Every file the app needs is listed in `APP_FILES`. When you add, rename or remove a file, update that list **and** bump `CACHE_VERSION`.
- Dexie is vendored at `js/vendor/dexie.mjs` — do not import libraries from a CDN, since they would not be available offline.
- After an update is pushed, the next launch with signal shows it. On iPhone the app must be fully closed (swiped away) and reopened; switching back to it only resumes the old page.

## iPhone specifics

- iOS ignores SVG manifest icons; the home-screen icon is `icons/apple-touch-icon.png` (180x180, square, no transparency).
- Number inputs use `inputmode` (`numeric` / `decimal`) so the number pad appears.
- Inputs must keep a font size of at least 16px, or iOS zooms in when they are focused.

## Style Guidelines

- CSS custom properties (variables) for colors and spacing — define in `:root`
- Mobile-first responsive design — this app is primarily used on a phone
- No CSS frameworks (no Bootstrap, Tailwind, etc.) unless explicitly requested

## What to Avoid

- Do not add a backend or server-side logic unless explicitly requested
- Do not introduce a bundler (Webpack, Vite, Parcel) unless explicitly requested
- Do not use `localStorage` for structured data — use Dexie/IndexedDB instead
- Do not commit `*.db`, `*.sqlite`, or any local data files
- Do not store secrets or API keys in the frontend code
