import assert from 'node:assert/strict'
import { punch, hoursBetween, keyOf } from './punch.js'

const who = { name: 'Ada Lovelace', dept: 'Technical', year: '3' }
let store = {}
let r

// 1st time name entered -> punch in
;({ store, record: r } = punch(store, who, '2026-07-28T09:00:00Z'))
assert.equal(r.out, null, 'first entry punches in')
assert.equal(r.in, '2026-07-28T09:00:00Z')

// same name again -> punch out
;({ store, record: r } = punch(store, { ...who, name: '  ADA   lovelace ' }, '2026-07-28T17:30:00Z'))
assert.equal(r.out, '2026-07-28T17:30:00Z', 'second entry punches out (case/space insensitive)')
assert.equal(hoursBetween(r.in, r.out), '8.50')

// third time -> fresh shift, punched in again
;({ store, record: r } = punch(store, who, '2026-07-29T09:15:00Z'))
assert.equal(r.out, null, 'after a closed shift, next entry punches in again')

// different name gets its own record
;({ store } = punch(store, { ...who, name: 'Grace Hopper' }, '2026-07-29T10:00:00Z'))
assert.deepEqual(Object.keys(store), [keyOf('Ada Lovelace'), keyOf('Grace Hopper')])

console.log('ok — punch in/out toggle works')
