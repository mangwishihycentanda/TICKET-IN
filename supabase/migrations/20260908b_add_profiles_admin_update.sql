-- Ticket-In: add missing admin-update policy on profiles.
--
-- Same bug class PastQ hit ("admin settings not permanent"): the
-- self-elevation-prevention trigger (protect_profile_privileged_fields)
-- was correctly written from day one to allow an admin to change ANOTHER
-- user's privileged fields - but that exception only matters if the row
-- is reachable at the RLS layer in the first place. Only
-- profiles_update_own existed, so an admin literally could not update
-- anyone else's profile row at all, regardless of what the trigger
-- would have allowed. Caught this proactively while building Manage
-- Users, before it caused a real "why doesn't this save" bug report.

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.ti_is_admin());
