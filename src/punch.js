// Display helpers. The punch in/out toggle itself now lives in the database
// (public.punch in supabase/schema.sql) so that the time is stamped server-side
// and one member can't hold two open shifts. Keeping a second copy of that
// logic here would only let the two drift apart.

export const hoursBetween = (a, b) =>
  ((new Date(b) - new Date(a)) / 3600000).toFixed(2)

export const clock = iso =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—:—'
