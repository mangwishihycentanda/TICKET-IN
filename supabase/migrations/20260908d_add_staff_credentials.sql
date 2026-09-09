-- Ticket-In: real staff credential capture.
--
-- Previously "verification" meant an admin clicking a button with
-- nothing to check against - the platform couldn't actually back up a
-- claim that its staff are real qualified professionals.
--
-- Deliberately a SEPARATE table from profiles, not new columns on it -
-- profiles.staff_verification_status/name are already visible to any
-- authenticated user via profiles_select_verified_staff (so clients can
-- see who claimed their ticket), and RLS filters rows, not columns. If
-- license_number/issuing_institution lived on profiles, they'd be
-- exposed to that same broad audience the moment a staff row becomes
-- visible - the same reason ticket_clinical_notes is its own table.
-- Credential data here is visible only to the staff member themselves
-- and admins.

create table public.staff_credentials (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) unique,
  license_number text,
  issuing_institution text,
  specialty text,
  submitted_at timestamptz not null default now()
);

alter table public.staff_credentials enable row level security;

create policy "staff_credentials_select_own_or_admin" on public.staff_credentials
  for select using (
    auth.uid() = staff_id or public.ti_is_admin()
  );

create policy "staff_credentials_insert_own" on public.staff_credentials
  for insert with check (auth.uid() = staff_id);

create policy "staff_credentials_update_own_or_admin" on public.staff_credentials
  for update using (
    auth.uid() = staff_id or public.ti_is_admin()
  );

-- Basic audit trail for verification decisions - low sensitivity (who
-- verified whom, and when), fine to keep on profiles alongside the
-- existing verification_status.
alter table public.profiles add column if not exists verified_by uuid references public.profiles(id);
alter table public.profiles add column if not exists verified_at timestamptz;
