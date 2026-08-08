# CIE Attendance

A brutalist punch-in / punch-out attendance tracker for CIE club members — built with React and Vite, with zero backend.

Members type their name, department, and year and hit **Punch**. The same name punches in on the first tap and punches out on the next, with in/out times and total hours shown automatically.

## Features

- **One-button toggle** — no separate "in" and "out" flows. Punching detects your current state and does the right thing.
- **Per-person shifts** — each name tracks its own open/closed shift independently.
- **Automatic hours** — out-time minus in-time, computed and displayed to two decimal places.
- **Fuzzy name matching** — `"Jane Doe"`, `"jane doe"`, and `"jane   doe"` all resolve to the same person.
- **Persistent, local, private** — records are saved to `localStorage`, so they survive a refresh or browser restart but never leave the device.
- **No install beyond Node** — no database, no API keys, no server to stand up.

## Quick start

```bash
npm install
npm run dev      # starts the dev server at http://localhost:5173
```

Other scripts:

```bash
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

## How it works

1. Pick your **department** from the seven chips.
2. Pick your **name** from the dropdown — it lists only that department's members.
3. Press **Punch →**. Year, branch, section, and roll number come from the roster, so there's nothing else to type.
4. The app looks up your name (case- and whitespace-insensitive):
   - No open shift → you're **punched in**, timestamp recorded.
   - Open shift found → it's closed, you're **punched out**, and your hours are shown.
   - Punching again after that starts a brand-new shift.

**Departments:** Technical · Operations & Finance · Graphic Design · Promotions & Sponsorship · Photography & Media · Content · Creatives

Members come from `src/roster.js`, transcribed from the official council department list. Add or remove people there — the dropdown, the year, and the branch/section all follow from it.

All records live under the `cie-attendance` key in `localStorage` as a map keyed by normalized name, e.g.:

```json
{
  "gannoji vedik": {
    "name": "GANNOJI VEDIK", "dept": "Technical", "year": "3",
    "branch": "CSD", "section": "B", "roll": "24R21A6771",
    "in": "2026-07-29T09:00:00.000Z", "out": null
  }
}
```

## Project structure

```
index.html          Vite entry point
public/bg.png        mascot / left-panel artwork
src/main.jsx          mounts the hero panel + app
src/App.jsx           form UI and the punch result card
src/roster.js         official council roster, by department
src/punch.js          pure punch/toggle logic + time helpers
src/punch.test.js     assert-based tests for punch.js
src/index.css         brutalist theme + responsive layout
vite.config.js        Vite + React plugin config
```

## Testing

```bash
node src/punch.test.js
```

Covers the punch toggle, re-punching after a closed shift, and that each name keeps its own independent record.

## Tech stack

- [React 18](https://react.dev/) — UI
- [Vite 6](https://vitejs.dev/) — dev server & bundler
- Plain CSS (no framework) for the brutalist look
- Browser `localStorage` as the only data store

## Known limitations

This is intentionally minimal — there's no backend, so a few things are out of scope by design:

- **No authentication** — anyone can punch in as anyone.
- **No server or shared log** — data is per-device only; punching in on one browser won't show up on another.
- **No admin view** — there's no dashboard to review everyone's attendance in one place.
- **Client clock is trusted** — timestamps come from the device's clock, so they can be manipulated by anyone with access to it. Swap in a server-issued timestamp if that's a concern.

## License

No license file yet — add one if this is meant to be shared or reused outside the club.
