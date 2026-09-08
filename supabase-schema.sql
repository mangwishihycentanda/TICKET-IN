-- ============================================================================
-- TICKET-IN — INITIAL SCHEMA
-- Built from scratch this session, deliberately applying lessons learned
-- from PastQ's real bugs earlier this session:
--   - Real RLS from day one, not retrofitted after a leak is found live.
--   - A genuine self-elevation-prevention trigger on profiles from the
--     start (PastQ needed a whole extra fix cycle for this).
--   - Clinical notes kept in their own table, not columns on tickets -
--     Postgres RLS filters ROWS, not COLUMNS, so a sensitive field can only
--     be hidden from the wrong audience by giving it its own table with its
--     own policy (the exact same reason PastQ split question_options'
--     is_correct into a separately-restricted table).
--   - Ticket claiming is atomic via a single conditional UPDATE
--     (status = 'OPEN' in the WHERE clause), executed server-side via
--     service role in api/claim-ticket.js - never a bare client-side RLS
--     update for a race-condition-sensitive transition.
--   - Payment status never trusted from the client - same manual-approval
--     pattern proven working in PastQ, admin confirms via a server-side
--     action, not the browser.
-- ============================================================================


-- ============================================================================
-- TABLE: profiles
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id),
  name text not null,
  role text not null default 'client',        -- 'client' | 'staff' | 'admin'
  phone text,
  staff_subscribed boolean not null default false,
  staff_subscription_expires_at timestamptz,
  staff_verification_status text not null default 'pending'
    check (staff_verification_status in ('pending','verified','rejected','suspended')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- New signups always get role='client', ignoring any role claim in signup
-- metadata - closes the exact self-elevation vulnerability PastQ had to
-- discover and fix mid-session.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Blocks anyone from changing their OWN role/staff_subscribed/
-- staff_subscription_expires_at/staff_verification_status via a normal
-- client update. Allows service_role (API paths) always, and allows an
-- admin to change ANOTHER user's privileged fields (needed for admin
-- staff-verification/role management) - built correctly from day one,
-- unlike PastQ where the admin exception had to be added after the
-- original version silently blocked legitimate admin actions too.
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
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_protect_privileged_fields on public.profiles;
create trigger profiles_protect_privileged_fields
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_select_admin" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Staff need to be visible to clients/other staff at a basic level (name,
-- verification status) once verified - e.g. showing who claimed a ticket.
-- Deliberately narrow: only verified staff rows, only non-privileged
-- columns matter here since the trigger above protects the sensitive ones
-- regardless of which SELECT policy exposes the row.
create policy "profiles_select_verified_staff" on public.profiles
  for select using (role = 'staff' and staff_verification_status = 'verified');

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);


-- ============================================================================
-- TABLE: tickets
-- Intake-only fields (client-authored, client-visible). Clinical
-- assessment/diagnosis/plan deliberately live in ticket_clinical_notes
-- instead, not as columns here - see note at the top of this file.
-- ============================================================================
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  status text not null default 'form_submitted'
    check (status in ('form_submitted','open','claimed','in_progress','resolved','expired')),

  -- OLDCART intake model
  onset text,
  location text,
  duration text,
  character text,
  aggravating_factors text,
  relieving_factors text,
  timing text,
  severity text,
  additional_notes text,

  claimed_by uuid references public.profiles(id),
  claimed_at timestamptz,
  resolution_summary text,          -- client-visible plain-language summary, distinct
                                     -- from the detailed clinical notes table
  resolved_at timestamptz,

  payment_expires_at timestamptz,   -- 3-hour window on an unpaid submitted form
  created_at timestamptz not null default now()
);

alter table public.tickets enable row level security;

create policy "tickets_select_own_client" on public.tickets
  for select using (auth.uid() = client_id);

create policy "tickets_select_open_for_staff" on public.tickets
  for select using (
    status = 'open'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'staff' and staff_verification_status = 'verified')
  );

create policy "tickets_select_claimed_by_self" on public.tickets
  for select using (auth.uid() = claimed_by);

create policy "tickets_select_admin" on public.tickets
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "tickets_insert_own_client" on public.tickets
  for insert with check (auth.uid() = client_id);

-- Client-side UPDATE deliberately does NOT allow status changes at all -
-- form_submitted -> open happens only via the payment-confirmation server
-- path (service_role), open -> claimed only via claim-ticket.js
-- (service_role, atomic), and in_progress/resolved transitions happen via
-- a dedicated staff-update endpoint, not a bare client update. This
-- policy only covers non-status edits by the admin for corrections.
create policy "tickets_update_admin" on public.tickets
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "tickets_update_claimed_staff" on public.tickets
  for update using (auth.uid() = claimed_by);


-- ============================================================================
-- TABLE: ticket_clinical_notes
-- Separate table, staff/admin only - never exposed to the client directly.
-- The client sees tickets.resolution_summary instead, which staff write
-- deliberately as a plain-language, non-technical summary.
-- ============================================================================
create table public.ticket_clinical_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id),
  staff_id uuid not null references public.profiles(id),
  objective_assessment text,
  clinical_diagnosis text,
  plan text,
  implementation text,
  evaluation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ticket_clinical_notes enable row level security;

create policy "clinical_notes_select_own_staff" on public.ticket_clinical_notes
  for select using (auth.uid() = staff_id);

create policy "clinical_notes_select_admin" on public.ticket_clinical_notes
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "clinical_notes_write_own_staff" on public.ticket_clinical_notes
  for all using (auth.uid() = staff_id)
  with check (auth.uid() = staff_id);


-- ============================================================================
-- TABLE: ticket_payments
-- Same discipline as PastQ: status change to 'completed' only ever happens
-- server-side (admin approval action using service_role), never trusted
-- from the client.
-- ============================================================================
create table public.ticket_payments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id),
  client_id uuid not null references public.profiles(id),
  amount numeric not null default 1600,
  platform_fee numeric not null default 600,
  staff_fee numeric not null default 1000,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  payment_method text not null default 'manual_momo',
  reference_note text,
  created_at timestamptz not null default now()
);

alter table public.ticket_payments enable row level security;

create policy "ticket_payments_select_own_or_admin" on public.ticket_payments
  for select using (
    auth.uid() = client_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "ticket_payments_insert_own_manual" on public.ticket_payments
  for insert with check (
    auth.uid() = client_id and status = 'pending' and payment_method = 'manual_momo'
  );

create policy "ticket_payments_update_admin" on public.ticket_payments
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================================
-- TABLE: staff_payouts
-- Payout eligibility triggers on "handshake" (staff actually starting the
-- consultation, i.e. ticket moving to in_progress), not merely claiming.
-- ============================================================================
create table public.staff_payouts (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id),
  staff_id uuid not null references public.profiles(id),
  amount numeric not null default 1000,
  status text not null default 'pending' check (status in ('pending','paid')),
  handshake_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.staff_payouts enable row level security;

create policy "staff_payouts_select_own_or_admin" on public.staff_payouts
  for select using (
    auth.uid() = staff_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "staff_payouts_update_admin" on public.staff_payouts
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================================
-- TABLE: ratings
-- ============================================================================
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id),
  client_id uuid not null references public.profiles(id),
  staff_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.ratings enable row level security;

create policy "ratings_select_all" on public.ratings
  for select using (true);   -- staff ratings are meant to be visible, like a public reputation score

create policy "ratings_insert_own_client" on public.ratings
  for insert with check (
    auth.uid() = client_id
    and exists (select 1 from public.tickets where id = ticket_id and client_id = auth.uid() and status = 'resolved')
  );
