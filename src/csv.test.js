import assert from 'node:assert/strict'
import { toCsv, localStamp, CSV_HEAD } from './csv.js'

const closed = {
  name: 'KATEPALLY TRIBHUVAN', roll: '24R21A05HG', dept: 'Technical',
  year: '3', branch: 'CSE', section: 'F',
  punched_in: '2026-08-08T09:00:00Z', punched_out: '2026-08-08T17:30:00Z', hours: 8.5,
}
const open = { ...closed, punched_out: null, hours: null }

const lines = toCsv([closed, open]).split('\r\n')

assert.equal(lines.length, 3, 'header + one row per shift')
assert.equal(lines[0], CSV_HEAD.map(h => `"${h}"`).join(','))

// an open shift is labelled, not left as a blank cell that reads as 0 hours
assert.ok(lines[2].endsWith('"STILL IN"'), lines[2])
assert.ok(lines[1].endsWith('"8.5"'), lines[1])

// no stray Z-suffixed ISO timestamps: Excel will not parse them
assert.ok(!toCsv([closed]).includes('Z"'), 'timestamps must be localised')

// commas and quotes in a name must not break the column layout
const nasty = toCsv([{ ...closed, name: 'DOE, JANE "JD"' }])
assert.ok(nasty.includes('"DOE, JANE ""JD"""'), nasty.split('\r\n')[1])
assert.equal(nasty.split('\r\n')[1].match(/","/g).length, CSV_HEAD.length - 1,
  'field count survives embedded commas')

// empty range still yields a usable file with headers
assert.equal(toCsv([]), CSV_HEAD.map(h => `"${h}"`).join(','))
assert.equal(toCsv(null), CSV_HEAD.map(h => `"${h}"`).join(','))

// bad input degrades to blank rather than "Invalid Date"
assert.equal(localStamp(null), '')
assert.equal(localStamp('not-a-date'), '')
assert.match(localStamp('2026-08-08T09:00:00Z'), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)

console.log('ok — csv export')
