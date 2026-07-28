import { useState } from 'react'
import { punch, clock, hoursBetween } from './punch.js'

const DEPTS = [
  'Technical',
  'Graphic Design',
  'Creatives',
  'Content Writing',
  'Promotions & Sponsorships',
  'Operations and Finance',
]
const YEARS = [['2', '2nd'], ['3', '3rd'], ['4', '4th']]
const KEY = 'cie-attendance'

export const initials = name =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')

export default function App() {
  const [store, setStore] = useState(() => JSON.parse(localStorage.getItem(KEY) || '{}'))
  const [record, setRecord] = useState(null)
  const [err, setErr] = useState('')

  function submit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const [name, dept, year] = ['name', 'dept', 'year'].map(k => (f.get(k) || '').trim())
    if (!name || !dept || !year) return setErr('ALL FIELDS REQUIRED.')
    const res = punch(store, { name, dept, year }, new Date().toISOString())
    localStorage.setItem(KEY, JSON.stringify(res.store))
    setStore(res.store)
    setErr('')
    setRecord(res.record)
  }

  if (record) {
    const out = !!record.out
    return (
      <div className="card">
        <div className="whoami">
          <div className="avatar">{initials(record.name)}</div>
          <div>
            <h2>{record.name}</h2>
            <p>{record.dept} · Year {record.year}</p>
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
        <button className="ghost" onClick={() => setRecord(null)}>Done</button>
      </div>
    )
  }

  return (
    <div className="card">
      <h1>Attendance</h1>
      <span className="tag">Punch in / punch out</span>
      <form onSubmit={submit} noValidate>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" autoComplete="name" placeholder="YOUR NAME" autoFocus />

        <label htmlFor="dept">Department</label>
        <select id="dept" name="dept" defaultValue="">
          <option value="" disabled>— SELECT —</option>
          {DEPTS.map(d => <option key={d}>{d}</option>)}
        </select>

        <label>Year</label>
        <div className="years">
          {YEARS.map(([v, ord]) => (
            <YearChip key={v} v={v} ord={ord} />
          ))}
        </div>

        <div className="err">{err}</div>
        <button type="submit">Punch →</button>
      </form>
    </div>
  )
}

// input + label pair so CSS `:checked + label` keeps working
function YearChip({ v, ord }) {
  return (
    <>
      <input type="radio" name="year" id={`y${v}`} value={v} />
      <label htmlFor={`y${v}`}>{v}<small>{ord}</small></label>
    </>
  )
}
