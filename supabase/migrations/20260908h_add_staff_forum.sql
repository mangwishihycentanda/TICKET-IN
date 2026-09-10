-- Ticket-In: staff discussion forum.
--
-- Deliberately staff/admin only, not public - unlike PastQ's forum,
-- there's no client-account audience here at all (clients are
-- account-free by design), and this is professional discussion between
-- verified healthcare staff, not a general community space.

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  subject text,
  parent_post_id uuid references public.forum_posts(id),
  staff_id uuid not null references public.profiles(id),
  staff_name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

alter table public.forum_posts enable row level security;

create policy "forum_posts_select_staff_admin" on public.forum_posts
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('staff','admin'))
  );

create policy "forum_posts_insert_verified_staff_or_admin" on public.forum_posts
  for insert with check (
    auth.uid() = staff_id
    and (
      public.ti_is_admin()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'staff' and staff_verification_status = 'verified')
    )
  );

-- Soft-delete only, same as PastQ's forum - author or admin, moderated
-- content stays auditable rather than vanishing without a trace.
create policy "forum_posts_update_own_or_admin" on public.forum_posts
  for update using (
    auth.uid() = staff_id or public.ti_is_admin()
  );
