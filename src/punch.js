// Attendance store shape: { [nameKey]: { name, dept, year, in: iso, out: iso|null } }

export const keyOf = name => name.trim().toLowerCase().replace(/\s+/g, ' ')

/** Toggle: open shift -> punch out. No shift, or shift already closed -> punch in. */
export function punch(store, who, nowIso) {
  const k = keyOf(who.name)
  const rec = store[k]
  const next = rec && !rec.out
    ? { ...rec, out: nowIso }
    : { ...who, in: nowIso, out: null }
  return { store: { ...store, [k]: next }, record: next }
}

export const hoursBetween = (a, b) =>
  ((new Date(b) - new Date(a)) / 3600000).toFixed(2)

export const clock = iso =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—:—'
