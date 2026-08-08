-- CIE Attendance — schema, security rules, and the punch function.
-- Run this once in the Supabase SQL editor, then run seed.sql.
--
-- Security model, in short:
--   * Members never log in. The browser holds the public `anon` key.
--   * anon can read the roster (it already ships in the JS bundle today) and can
--     call punch() — nothing else. It has NO direct access to the punch log, so
--     the attendance history can't be scraped even though the key is public.
--   * Reading the log requires an authenticated user listed in `admins`.

-- ---------------------------------------------------------------- tables ----

create table if not exists public.members (
  roll    text primary key,
  name    text not null,
  dept    text not null,
  year    text not null,
  branch  text not null,
  section text not null default ''
);

create table if not exists public.punches (
  id          bigint generated always as identity primary key,
  roll        text not null references public.members(roll) on update cascade,
  punched_in  timestamptz not null default now(),
  punched_out timestamptz,
  constraint punches_out_after_in check (punched_out is null or punched_out >= punched_in)
);

-- A member can have at most one shift open at a time. This is what makes the
-- in/out toggle correct under double-taps or two phones at once — the second
-- insert fails at the database rather than silently opening a duplicate shift.
create unique index if not exists punches_one_open_per_member
  on public.punches (roll) where punched_out is null;

create index if not exists punches_roll_in_idx
  on public.punches (roll, punched_in desc);

-- Who may read the log. Deliberately a table, not a hardcoded email, so access
-- can be granted or revoked without a code change.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note    text
);

-- ------------------------------------------------------------------ rls ----

alter table public.members enable row level security;
alter table public.punches enable row level security;
alter table public.admins  enable row level security;

-- `admins` gets RLS on with no policies at all: unreachable through the API,
-- readable only by the security-definer function below.

drop policy if exists members_readable on public.members;
create policy members_readable on public.members
  for select to anon, authenticated using (true);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

drop policy if exists punches_admin_read on public.punches;
create policy punches_admin_read on public.punches
  for select to authenticated using (public.is_admin());

-- No insert/update policy for anyone. All writes go through punch(), which runs
-- as the owner and is the only sanctioned path in.

-- ------------------------------------------------------------- functions ----

-- Toggle: open shift -> punch out. No shift, or last one closed -> punch in.
-- Timestamps come from the server, so a member changing their phone's clock
-- cannot affect the recorded time.
create or replace function public.punch(p_roll text)
returns table (
  roll text, name text, dept text, year text, branch text, section text,
  punched_in timestamptz, punched_out timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members%rowtype;
  v_open   public.punches%rowtype;
  v_row    public.punches%rowtype;
begin
  select * into v_member from public.members m where m.roll = p_roll;
  if not found then
    raise exception 'unknown roll number: %', p_roll
      using errcode = 'no_data_found';
  end if;

  -- FOR UPDATE: serialises concurrent taps on the same member
  select * into v_open from public.punches p
    where p.roll = p_roll and p.punched_out is null
    for update;

  if found then
    update public.punches p set punched_out = now()
      where p.id = v_open.id
      returning * into v_row;
  else
    insert into public.punches (roll) values (p_roll)
      returning * into v_row;
  end if;

  return query select
    v_member.roll, v_member.name, v_member.dept, v_member.year,
    v_member.branch, v_member.section, v_row.punched_in, v_row.punched_out;
end;
$$;

revoke all on function public.punch(text) from public;
grant execute on function public.punch(text) to anon, authenticated;

-- ------------------------------------------------------------ admin view ----

-- security_invoker: the caller's RLS applies, so this returns rows only to an
-- authenticated admin. Powers the dashboard and the CSV export.
create or replace view public.punch_log
with (security_invoker = on) as
select
  p.id,
  m.name, m.dept, m.year, m.branch, m.section, p.roll,
  p.punched_in,
  p.punched_out,
  round(extract(epoch from (p.punched_out - p.punched_in)) / 3600.0, 2) as hours
from public.punches p
join public.members m on m.roll = p.roll;

-- --------------------------------------------------------------- grants ----

revoke all on public.punches from anon;
revoke all on public.admins  from anon, authenticated;
grant select on public.members to anon, authenticated;
grant select on public.punch_log to authenticated;
