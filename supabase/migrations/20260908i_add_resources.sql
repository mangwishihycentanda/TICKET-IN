-- Ticket-In: staff resource library.
--
-- Admin-curated reference material (clinical guidelines, protocols,
-- links, written notes) for staff to consult - distinct from the
-- Forum, which is open discussion between staff. Resources are meant
-- to be vetted/authoritative, so only admin can add/edit/remove them;
-- staff can read but not contribute here (they have the Forum for
-- that).

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  link_url text,
  text_content text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.resources enable row level security;

create policy "resources_select_staff_admin" on public.resources
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('staff','admin'))
  );

create policy "resources_write_admin" on public.resources
  for all using (public.ti_is_admin())
  with check (public.ti_is_admin());
