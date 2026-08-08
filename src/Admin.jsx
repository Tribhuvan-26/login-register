import { useEffect, useState } from 'react'
import { supabase, signIn, signOut, isAdmin, loadLog } from './supabase.js'
import { clock } from './punch.js'

const day = iso => new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short' })

/** yyyy-mm-dd in local time (toISOString would shift the day for IST). */
function isoDay(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function toCsv(rows) {
  const head = ['Name', 'Roll', 'Department', 'Year', 'Branch', 'Section', 'In', 'Out', 'Hours']
  // quote everything: names contain commas, and Excel splits on them
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const body = rows.map(r => [
    r.name, r.roll, r.dept, r.year, r.branch, r.section,
    r.punched_in, r.punched_out ?? '', r.hours ?? '',
  ].map(esc).join(','))
  return [head.map(esc).join(','), ...body].join('\r\n')
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null) // null = not yet checked
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setAllowed(null); setChecking(false); return }
    setChecking(true)
    isAdmin().then(ok => { setAllowed(ok); setChecking(false) })
  }, [session])

  if (!session) return <Login />
  if (checking) return <Shell title="Admin"><span className="tag">Checking access…</span></Shell>

  // Signed in but not in the admins table — the database refuses the data, so
  // this is a message, not the thing keeping them out.
  if (!allowed) {
    return (
      <Shell title="No access">
        <span className="tag tag-out">Not an admin</span>
        <p className="derived">{session.user.email} is signed in but not authorised.</p>
        <button className="ghost" onClick={signOut}>Sign out</button>
      </Shell>
    )
  }
  return <Dashboard email={session.user.email} />
}

function Shell({ title, children }) {
  return (
    <div className="card">
      <h1>{title}</h1>
      {children}
      <a className="back" href="#">← Back to punch</a>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { error } = await signIn(email, password)
    if (error) setErr(error.message.toUpperCase())
    setBusy(false)
  }

  return (
    <Shell title="Admin">
      <span className="tag">Sign in</span>
      <form onSubmit={submit} noValidate>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username"
               value={email} onChange={e => setEmail(e.target.value)} />
        <label htmlFor="pw">Password</label>
        <input id="pw" type="password" autoComplete="current-password"
               value={password} onChange={e => setPassword(e.target.value)} />
        <div className="err">{err}</div>
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button>
      </form>
    </Shell>
  )
}

function Dashboard({ email }) {
  const today = isoDay(new Date())
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    setRows(null)
    // `to` is a date, so include the whole of that day
    loadLog({ from: `${from}T00:00:00`, to: `${to}T23:59:59.999` })
      .then(setRows)
      .catch(e => setErr(e.message))
  }, [from, to])

  const open = (rows ?? []).filter(r => !r.punched_out)
  const totalHours = (rows ?? [])
    .reduce((sum, r) => sum + (Number(r.hours) || 0), 0)
    .toFixed(2)

  return (
    <div className="card card-wide">
      <h1>Admin</h1>
      <span className="tag">{email}</span>

      <div className="range">
        <div>
          <label htmlFor="from">From</label>
          <input id="from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="to">To</label>
          <input id="to" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      <div className="stats">
        <div className="stat"><b>{open.length}</b><span>In now</span></div>
        <div className="stat"><b>{rows ? rows.length : '—'}</b><span>Shifts</span></div>
        <div className="stat"><b>{totalHours}</b><span>Hours</span></div>
      </div>

      {err && <div className="err">{err.toUpperCase()}</div>}

      <div className="log">
        {!rows && <p className="derived">Loading…</p>}
        {rows && rows.length === 0 && <p className="derived">No punches in this range.</p>}
        {rows && rows.map(r => (
          <div key={r.id} className={`log-row ${r.punched_out ? '' : 'log-open'}`}>
            <b>{r.name}</b>
            <small>{r.dept} · {r.roll}</small>
            <span>
              {day(r.punched_in)} {clock(r.punched_in)}
              {' → '}
              {r.punched_out ? clock(r.punched_out) : 'IN'}
              {r.hours != null ? ` · ${r.hours}h` : ''}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => download(`attendance-${from}_to_${to}.csv`, toCsv(rows ?? []))}
        disabled={!rows || rows.length === 0}
      >
        Export CSV
      </button>
      <button className="ghost" onClick={signOut}>Sign out</button>
      <a className="back" href="#">← Back to punch</a>
    </div>
  )
}
