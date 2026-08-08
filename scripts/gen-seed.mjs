// Regenerate supabase/seed.sql from the roster that the app itself uses, so the
// database and the dropdown can never disagree.
//   node scripts/gen-seed.mjs > supabase/seed.sql
import { ROSTER } from '../src/roster.js'

const q = s => "'" + String(s).replace(/'/g, "''") + "'"

const rows = []
const seen = new Map()
let deptOrder = 0
for (const [dept, people] of Object.entries(ROSTER)) {
  deptOrder += 1
  for (const p of people) {
    if (seen.has(p.roll)) {
      // roll is the primary key — a duplicate would abort the whole seed
      console.error(`duplicate roll ${p.roll}: ${seen.get(p.roll)} / ${dept} ${p.name}`)
      process.exit(1)
    }
    seen.set(p.roll, `${dept} ${p.name}`)
    rows.push(`  (${q(p.roll)}, ${q(p.name)}, ${q(dept)}, ${q(p.year)}, ${q(p.branch)}, ${q(p.section)}, ${deptOrder})`)
  }
}

process.stdout.write(`-- Council roster — GENERATED from src/roster.js, do not hand-edit.
-- Regenerate: node scripts/gen-seed.mjs > supabase/seed.sql
-- Re-running is safe: existing members are updated, none are duplicated.

insert into public.members (roll, name, dept, year, branch, section, dept_order) values
${rows.join(',\n')}
on conflict (roll) do update set
  name    = excluded.name,
  dept    = excluded.dept,
  year    = excluded.year,
  branch  = excluded.branch,
  section = excluded.section,
  dept_order = excluded.dept_order;
`)
