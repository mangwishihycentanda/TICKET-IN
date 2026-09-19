--Ticket-In: hospital accounts, doctor rosters, and an in-person consult
-- path alongside the existing freelance/remote flow.
--
-- Also fixes a real pre-existing bug found while touching this exact
-- code path: protect_profile_privileged_fields() resets `role` back to
-- its old value on ANY client-side update unless the caller is
-- service_role, or is an admin acting on a DIFFERENT user's row. A
-- freshly-registered staff member updating their OWN row (the only path
-- App.jsx's handleAuth() used) matches neither exception, so
-- `role: "staff"` was being silently reverted to "client" the whole
-- time - newly registered professionals never actually became staff.
-- Fixed by moving role/credential finalization to a new service-role
-- endpoint (api/finalize-registration.js) instead of a client update.
-- Same endpoint now handles hospital registration too.

-- ============================================================================
-- profiles: add email (for looking up an existing doctor by email when a
-- hospital wants to add them to its roster - auth.users isn't reachable
-- via PostgREST, so a denormalized copy here is the simplest reliable
-- way to do that lookup) and hospital_id (which hospital, if any, a
-- staff member is affiliated with; null = freelance, unchanged today).
-- ============================================================================
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists hospital_id uuid;

-- Backfill existing rows from auth.users - this migration runs with
-- elevated DB privileges (not through PostgREST), so auth.users is
-- directly reachable here even though the app never can.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    'client',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Re-guard privileged fields to also cover hospital_id (which hospital a
-- doctor belongs to must not be self-assignable or hijackable by another
-- hospital - only service_role, via the new link/unlink endpoint, or an
-- admin, can change it).
create or replace function public.protect_profile_privileged_fields()
returns trigger as $$
declare
  actor_is_admin boolean;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  select (role = 'admin') into actor_is_admin
  from public.profiles
  where id = auth.uid();

  if coalesce(actor_is_admin, false) and new.id <> auth.uid() then
    return new;
  end if;

  new.role := old.role;
  new.staff_subscribed := old.staff_subscribed;
  new.staff_subscription_expires_at := old.staff_subscription_expires_at;
  new.staff_verification_status := old.staff_verification_status;
  new.hospital_id := old.hospital_id;
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- TABLE: hospitals
-- Org-level account. A hospital's own login (profiles.role = 'hospital')
-- registers this row directly (created_by = its own id) - same pattern
-- staff_credentials already uses for self-service insert. Verification
-- reuses profiles.staff_verification_status on the hospital's OWN profile
-- row rather than adding a second, parallel verified/pending column here:
-- one gate, one place an admin looks, and it automatically hides a
-- hospital everywhere (client dropdown, doctor-visible queue) the moment
-- an admin un-verifies it - no second field to keep in sync.
-- ============================================================================
create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) unique,
  name text not null,
  town text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.hospitals enable row level security;

-- SECURITY DEFINER helpers so the profiles<->hospitals policies below
-- never query each other's table directly under RLS. Found by actually
-- testing this migration against a real Postgres instance (impersonating
-- non-superuser roles, not just the connecting superuser, which silently
-- bypasses RLS and would have hidden this): a policy ON hospitals that
-- queries profiles, combined with a policy ON profiles that queries
-- hospitals, is an infinite-recursion cycle the moment either table's
-- RLS is evaluated - exactly the same bug class
-- 20260908_fix_profiles_rls_recursion.sql already hit once (there, a
-- policy ON profiles queried profiles itself). These functions run with
-- the function owner's privileges, bypassing RLS on their internal
-- lookup and breaking the cycle.
create or replace function public.ti_profile_verified(p_id uuid)
returns boolean as $$
  select coalesce((select staff_verification_status = 'verified' from public.profiles where id = p_id), false)
$$ language sql security definer stable;

create or replace function public.ti_hospital_owner(p_hospital_id uuid)
returns uuid as $$
  select created_by from public.hospitals where id = p_hospital_id
$$ language sql security definer stable;

-- Client check-in is unauthenticated (anon key) - the dropdown of
-- hospitals to choose from must be readable without a session, but only
-- ever shows hospitals whose owning account has actually been verified
-- by an admin. An unverified/fake hospital account cannot make itself
-- selectable by clients no matter what it writes to this table.
create policy "hospitals_select_verified_anyone" on public.hospitals
  for select using ( public.ti_profile_verified(hospitals.created_by) );

create policy "hospitals_select_own" on public.hospitals
  for select using (auth.uid() = created_by);

create policy "hospitals_select_admin" on public.hospitals
  for select using (public.ti_is_admin());

create policy "hospitals_insert_own" on public.hospitals
  for insert with check (auth.uid() = created_by);

create policy "hospitals_update_own" on public.hospitals
  for update using (auth.uid() = created_by);

create policy "hospitals_update_admin" on public.hospitals
  for update using (public.ti_is_admin());

-- A hospital needs to see the doctors affiliated with it (to know who's
-- on its roster and whether their credential verification is still
-- pending) - broader than profiles_select_verified_staff, which only
-- shows already-verified staff to the general authenticated audience.
create policy "profiles_select_hospital_doctors" on public.profiles
  for select using (
    role = 'staff'
    and profiles.hospital_id is not null
    and public.ti_hospital_owner(profiles.hospital_id) = auth.uid()
  );

-- ============================================================================
-- tickets: in-person-at-a-hospital path alongside the existing remote
-- (freelance-pool) flow. remote tickets are entirely unaffected -
-- hospital_id stays null and behavior is identical to before this
-- migration.
-- ============================================================================
alter table public.tickets add column if not exists consult_type text not null default 'remote'
  check (consult_type in ('remote','in_person'));
alter table public.tickets add column if not exists hospital_id uuid references public.hospitals(id);

alter table public.tickets add constraint tickets_hospital_id_matches_consult_type check (
  (consult_type = 'in_person' and hospital_id is not null)
  or (consult_type = 'remote' and hospital_id is null)
);

-- Replace the open-queue policy so a freelance doctor's board only ever
-- shows remote tickets (unchanged from before), and an in-person ticket
-- is only visible to a doctor on THAT hospital's roster - never the
-- general freelance pool, and never a different hospital's doctors.
drop policy if exists "tickets_select_open_for_staff" on public.tickets;
create policy "tickets_select_open_for_staff" on public.tickets
  for select using (
    status = 'open'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff' and p.staff_verification_status = 'verified'
        and (
          (tickets.consult_type = 'remote')
          or (tickets.consult_type = 'in_person' and p.hospital_id = tickets.hospital_id)
        )
    )
  );

-- The hospital's own dashboard index - every ticket routed to it,
-- regardless of status (open/claimed/in_progress/resolved/expired), so
-- it can see what it's been sent and what happened to it. Same level of
-- detail a staff member already sees for tickets they can access
-- (OLDCART intake fields); clinical diagnosis/plan notes stay staff/
-- admin-only via ticket_clinical_notes, unaffected by this policy.
create policy "tickets_select_hospital_own" on public.tickets
  for select using (
    consult_type = 'in_person'
    and exists (
      select 1 from public.hospitals h
      where h.id = tickets.hospital_id and h.created_by = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
