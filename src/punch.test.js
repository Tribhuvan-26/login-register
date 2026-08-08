import assert from 'node:assert/strict'
import { hoursBetween, clock } from './punch.js'

// whole and part hours
assert.equal(hoursBetween('2026-07-28T09:00:00Z', '2026-07-28T17:30:00Z'), '8.50')
assert.equal(hoursBetween('2026-07-28T09:00:00Z', '2026-07-28T09:00:00Z'), '0.00')

// across midnight — the DB stores instants, so a shift may span two dates
assert.equal(hoursBetween('2026-07-28T23:00:00Z', '2026-07-29T01:15:00Z'), '2.25')

// an open shift has no out time; the card shows a placeholder rather than NaN
assert.equal(clock(null), '—:—')
assert.equal(clock(undefined), '—:—')
assert.match(clock('2026-07-28T09:00:00Z'), /\d/)

console.log('ok — time helpers')
console.log('note: the punch toggle is enforced in SQL and is not covered here')
