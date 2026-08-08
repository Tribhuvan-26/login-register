import { Fragment, useState } from 'react'
import { punch, clock, hoursBetween } from './punch.js'
import { DEPTS, ROSTER, findByRoll } from './roster.js'

const KEY = 'cie-attendance'
const slug = s => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase()

export const initials = name =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')

/** "3", "CSE", "F" -> "YEAR 3 · CSE F" */
const describe = p => `Year ${p.year} · ${p.branch}${p.section ? ` ${p.section}` : ''}`

export default function App() {
  const [store, setStore] = useState(() => JSON.parse(localStorage.getItem(KEY) || '{}'))
  const [record, setRecord] = useState(null)
  const [err, setErr] = useState('')
  const [dept, setDept] = useState('')
  // rolls are unique, names aren't — so the dropdown is keyed on roll
  const [roll, setRoll] = useState('')

  const person = findByRoll(dept, roll)

  function pickDept(d) {
    setDept(d)
    setRoll('') // different roster, so any previous pick is stale
    setErr('')
  }

  function submit(e) {
    e.preventDefault()
    if (!dept) return setErr('PICK A DEPARTMENT.')
    if (!person) return setErr('PICK YOUR NAME.')
    // year/branch/section/roll come from the roster, not from the member
    const res = punch(store, { ...person, dept }, new Date().toISOString())
    localStorage.setItem(KEY, JSON.stringify(res.store))
    setStore(res.store)
    setErr('')
    setRecord(res.record)
  }

  function done() {
    setRecord(null)
    setDept('')
    setRoll('')
  }

  if (record) {
    const out = !!record.out
    return (
      <div className="card">
        <div className="whoami">
          <div className="avatar">{initials(record.name)}</div>
          <div>
            <h2>{record.name}</h2>
            <p>{record.dept} · Year {record.year}{record.roll ? ` · ${record.roll}` : ''}</p>
          </div>
        </div>
        <span className={`tag ${out ? 'tag-out' : ''}`}>
          {out ? 'Punched out' : 'Punched in'}
        </span>
        <div className="stats">
          <div className="stat"><b>{clock(record.in)}</b><span>In</span></div>
          <div className="stat"><b>{clock(record.out)}</b><span>Out</span></div>
          <div className="stat"><b>{out ? hoursBetween(record.in, record.out) : '—'}</b><span>Hours</span></div>
        </div>
        <button className="ghost" onClick={done}>Done</button>
      </div>
    )
  }

  return (
    <div className="card">
      <h1>Attendance</h1>
      <span className="tag">Punch in / punch out</span>
      <form onSubmit={submit} noValidate>
        <label>Department</label>
        <div className="depts">
          {DEPTS.map(d => (
            <Fragment key={d}>
              <input
                type="radio" name="dept" id={`d-${slug(d)}`} value={d}
                checked={dept === d} onChange={() => pickDept(d)}
              />
              <label htmlFor={`d-${slug(d)}`}>{d}</label>
            </Fragment>
          ))}
        </div>

        {dept && (
          <>
            <label htmlFor="who">Name</label>
            <select
              id="who" value={roll}
              onChange={e => { setRoll(e.target.value); setErr('') }}
            >
              <option value="" disabled>— SELECT —</option>
              {ROSTER[dept].map(p => (
                <option key={p.roll} value={p.roll}>{p.name}</option>
              ))}
            </select>
            <p className="derived">{person ? describe(person) : `${ROSTER[dept].length} members`}</p>
          </>
        )}

        <div className="err">{err}</div>
        <button type="submit">Punch →</button>
      </form>
    </div>
  )
}
