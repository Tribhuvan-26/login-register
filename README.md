# CIE Attendance

Brutalist punch-in / punch-out page for CIE club members. React + Vite, no backend.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
```

## How it works

Enter name, department, year → **Punch**.

- First entry for a name opens a shift → `PUNCHED IN`
- Same name again → closes it → `PUNCHED OUT` with in/out time and hours
- Entering again after that starts a fresh shift

Name matching ignores case and extra spaces. Records live in `localStorage` under `cie-attendance`, so they survive a browser restart but stay on that device.

Departments: Technical · Graphic Design · Creatives · Content Writing · Promotions & Sponsorships · Operations and Finance
Years: 2 / 3 / 4

## Test

```bash
node src/punch.test.js
```

Covers the punch toggle, re-punch after a closed shift, and per-name records.

## Files

```
index.html        Vite entry
public/bg.png     mascot / left panel art
src/main.jsx      mounts hero panel + app
src/App.jsx       form and result card
src/punch.js      punch logic (pure)
src/punch.test.js assert-based check
src/index.css     brutalist theme + responsive layout
```

## Not built

No auth, no server, no admin log view. Device clock is trusted — swap in a server timestamp if anyone could fake it.
