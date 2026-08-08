# CIE Attendance

A brutalist punch-in / punch-out attendance tracker for CIE club members — React and Vite on the front, Supabase (hosted Postgres) behind it.

Members pick their department, pick their name, and hit **Punch**. The first tap opens a shift, the next closes it, and hours are computed automatically. The log is shared across every device, and a single admin can review it and export CSV.

## Features

- **One-button toggle** — no separate "in" and "out" flows. The database detects your current state and does the right thing.
- **Roster-driven** — pick a department, then a name from that department. Year, branch, section and roll number come from the roster, so there's nothing to type and nothing to mistype.
- **Shared log** — punches live in Postgres, so a shift opened on one phone can be closed on another.
- **Server-stamped times** — timestamps come from the database, not the device, so changing a phone's clock can't alter recorded hours.
- **One open shift per member** — enforced by a database constraint, not hopeful client code, so double-taps and races can't create duplicate shifts.
- **Admin dashboard** — who's in right now, history over a date range, and CSV export. Behind a login, enforced by the database.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL + anon key
npm run dev                  # http://localhost:5173
```

First-time database setup, in the Supabase SQL editor:

1. Run `supabase/schema.sql` — tables, security rules, the `punch()` function.
2. Run `supabase/seed.sql` — the 104 council members.
3. Create your admin under **Authentication → Users**, then authorise it:
   ```sql
   insert into public.admins (user_id, note) values ('<user-uuid>', 'your name');
   ```

Other scripts:

```bash
npm run build              # production build → dist/
npm run preview            # preview the production build locally
node scripts/gen-seed.mjs > supabase/seed.sql   # regenerate the seed from src/roster.js
```

## How it works

1. Pick your **department** from the seven chips.
2. Pick your **name** from the dropdown — it lists only that department's members.
3. Press **Punch →**. The app calls one database function, `punch(roll)`, which:
   - finds no open shift → opens one, stamped `now()`;
   - finds an open shift → closes it and returns your hours;
   - punching again after that starts a fresh shift.

**Departments:** Technical · Operations & Finance · Graphic Design · Promotions & Sponsorship · Photography & Media · Content · Creatives

The admin dashboard lives at **`/#admin`**.

## Security model

Members never log in, so the browser holds the public `anon` key. Anyone can read that key out of the JS bundle — that's what it's for — so the access rules live in the database rather than the app:

- `anon` may **read the roster** (it already ships in the bundle) and **call `punch(roll)`**. Nothing else.
- `anon` has **no access to the punch log at all**. Attendance history can't be read or scraped with the public key.
- Reading the log requires a signed-in user listed in the `admins` table, enforced by row-level security on every query.

Admin access is a database row, not a hardcoded name, so it can be granted or revoked without a code change. A client-side check like `if (name === '…')` would be bypassed by anyone who opens devtools.

## Adding or removing members

Edit `src/roster.js`, then:

```bash
node scripts/gen-seed.mjs > supabase/seed.sql
```

and run the regenerated `seed.sql`. Re-running is safe — existing members are updated in place, none are duplicated. The seed is generated rather than hand-written so the database and the dropdown can't drift apart.

## Project structure

```
index.html            Vite entry point
public/bg.png         mascot / left-panel artwork
src/main.jsx          mounts the hero panel + app
src/App.jsx           punch flow: department chips, name dropdown, result card
src/Admin.jsx         admin login, dashboard, CSV export
src/supabase.js       client + every database call in one place
src/roster.js         council roster — the source the seed is generated from
src/punch.js          time/display helpers
src/punch.test.js     assert-based tests for punch.js
src/index.css         brutalist theme + responsive layout
scripts/gen-seed.mjs  roster.js -> supabase/seed.sql
supabase/schema.sql   tables, RLS policies, punch(), admin view
supabase/seed.sql     GENERATED — do not hand-edit
vite.config.js        Vite + React plugin config
```

## Testing

```bash
node src/punch.test.js
```

Covers the time helpers. Note the punch toggle itself is now enforced in SQL — the unique index and the `punch()` function — and is **not** covered by these tests.

## Tech stack

- [React 18](https://react.dev/) — UI
- [Vite 6](https://vitejs.dev/) — dev server & bundler
- [Supabase](https://supabase.com/) — hosted Postgres, auth, auto-generated REST API
- Plain CSS (no framework) for the brutalist look

## Known limitations

- **Members don't log in, so anyone can punch as anyone.** A deliberate trade for convenience; the roster dropdown means it takes one tap either way. If it matters, the usual fixes are a shared department PIN or restricting punches to the campus network.
- **No offline mode** — the app needs the database to load the roster or record a punch.
- **Roster edits need a redeploy of the seed**, not just a UI action; there's no admin screen for adding members yet.

## License

No license file yet — add one if this is meant to be shared or reused outside the club.
