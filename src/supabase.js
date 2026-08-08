import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail loudly at startup rather than with a confusing 401 on first punch
if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local.'
  )
}

export const supabase = createClient(url, key)

/** Roster for the pickers. Read-only for everyone; drives dept chips + name list. */
export async function loadMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('roll, name, dept, year, branch, section, dept_order')
    .order('dept_order')            // departments in source-document order
    .order('year', { ascending: false })
    .order('name')
  if (error) throw error
  return data
}

/**
 * Toggle a shift. The database decides in-vs-out and stamps the time, so a
 * member changing their phone clock cannot affect recorded hours.
 */
export async function punchToggle(roll) {
  const { data, error } = await supabase.rpc('punch', { p_roll: roll })
  if (error) throw error
  // the function returns a single row
  return Array.isArray(data) ? data[0] : data
}

// ----------------------------------------------------------------- admin ----

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

/** True only for a signed-in user listed in the admins table. */
export async function isAdmin() {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return !!data
}

/** Full log, newest first. RLS returns rows only to an admin. */
export async function loadLog({ from, to } = {}) {
  let q = supabase
    .from('punch_log')
    .select('*')
    .order('punched_in', { ascending: false })
  if (from) q = q.gte('punched_in', from)
  if (to) q = q.lte('punched_in', to)
  const { data, error } = await q
  if (error) throw error
  return data
}
