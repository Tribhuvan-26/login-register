import { Fragment, useEffect, useState } from 'react'
import { clock, hoursBetween } from './punch.js'
import { loadMembers, punchToggle } from './supabase.js'
import Admin from './Admin.jsx'

const slug = s => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase()

export const initials = name =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')

/** "3", "CSE", "F" -> "Year 3 · CSE F" */
const describe = p => `Year ${p.year} · ${p.branch}${p.section ? ` ${p.section}` : ''}`

/** Roster rows -> ordered dept list + lookup, preserving the roster's own order. */
function groupByDept(rows) {
  const byDept = new Map()
  for (const r of rows) {
    if (!byDept.has(r.dept)) byDept.set(r.dept, [])
    byDept.get(r.dept).push(r)
  }
  return byDept
}

export default function App() {
  // #admin is enough of a router for two screens; no dependency needed
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  if (hash === '#admin') return <Admin />
  return <Punch />
}

function Punch() {
  const [members, setMembers] = useState(null) // null = still loading
  const [loadErr, setLoadErr] = useState('')
  const [record, setRecord] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [dept, setDept] = useState('')
  // rolls are unique, names aren't — so the dropdown is keyed on roll
  const [roll, setRoll] = useState('')

  useEffect(() => {
    loadMembers()
      .then(setMembers)
      .catch(e => setLoadErr(e.message || 'Could not reach the database.'))
  }, [])

  if (loadErr) {
    return (
      <div className="card">
        <h1>Offline</h1>
        <span className="tag tag-out">Database unreachable</span>
        <p className="derived">{loadErr}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  if (!members) {
    return (
      <div className="card">
        <h1>Attendance</h1>
        <span className="tag">Loading roster…</span>
      </div>
    )
  }

  const byDept = groupByDept(members)
  const depts = [...byDept.keys()]
  const people = dept ? byDept.get(dept) : []
  const person = people.find(p => p.roll === roll)

  function pickDept(d) {
    setDept(d)
    setRoll('') // different roster, so any previous pick is stale
    setErr('')
  }

  async function submit(e) {
    e.preventDefault()
    if (!dept) return setErr('PICK A DEPARTMENT.')
    if (!person) return setErr('PICK YOUR NAME.')
    setBusy(true)
    setErr('')
    try {
      setRecord(await punchToggle(person.roll))
    } catch (e2) {
      setErr((e2.message || 'PUNCH FAILED — TRY AGAIN.').toUpperCase())
    } finally {
      setBusy(false)
    }
  }

  function done() {
    setRecord(null)
    setDept('')
    setRoll('')
  }

  if (record) {
    const out = !!record.punched_out
    return (
      <div className="card">
        <div className="whoami">
          <div className="avatar">{initials(record.name)}</div>
          <div>
            <h2>{record.name}</h2>
            <p>{record.dept} · Year {record.year} · {record.roll}</p>
          </div>
        </div>
        <span className={`tag ${out ? 'tag-out' : ''}`}>
          {out ? 'Punched out' : 'Punched in'}
        </span>
        <div className="stats">
          <div className="stat"><b>{clock(record.punched_in)}</b><span>In</span></div>
          <div className="stat"><b>{clock(record.punched_out)}</b><span>Out</span></div>
          <div className="stat">
            <b>{out ? hoursBetween(record.punched_in, record.punched_out) : '—'}</b>
            <span>Hours</span>
          </div>
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
          {depts.map(d => (
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
              {people.map(p => (
                <option key={p.roll} value={p.roll}>{p.name}</option>
              ))}
            </select>
            <p className="derived">
              {person ? describe(person) : `${people.length} members`}
            </p>
          </>
        )}

        <div className="err">{err}</div>
        <button type="submit" disabled={busy}>
          {busy ? 'Punching…' : 'Punch →'}
        </button>
      </form>
    </div>
  )
}
