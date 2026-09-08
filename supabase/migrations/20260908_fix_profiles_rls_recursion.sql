-- Ticket-In: fix infinite RLS recursion on profiles.
--
-- profiles_select_admin checked admin status with:
--   exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
-- inlined directly in a policy ON profiles itself. That inner SELECT on
-- profiles must itself be evaluated under profiles' RLS policies -
-- including this same one - recursing infinitely. Postgres correctly
-- detects this and throws "infinite recursion detected in policy for
-- relation profiles", which is exactly the 500 error found via live
-- testing on the very first profile load after sign-in.
--
-- Fix: wrap the check in a SECURITY DEFINER function. A security-definer
-- function's internal query runs with the function owner's privileges,
-- which bypasses RLS on that inner query and breaks the recursion - the
-- same pattern PastQ's own database already uses correctly for exactly
-- this reason (its is_admin() function).
--
-- Every OTHER admin-check policy in this schema (on tickets,
-- ticket_payments, etc.) queries profiles from a DIFFERENT table's
-- policy, which does not recurse - only a policy ON profiles querying
-- profiles again causes this. Only this one policy needed the fix.

create or replace function public.ti_is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.ti_is_admin());
