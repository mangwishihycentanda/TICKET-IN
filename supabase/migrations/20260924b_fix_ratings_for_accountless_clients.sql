-- The `ratings` table was built assuming the OLD client-account model
-- (client_id tied to a real auth.users row via profiles). That model was
-- removed in 20260908e_remove_client_accounts.sql - clients now check in
-- with just phone + client_code, no login, no auth.uid() at all. Nobody
-- updated ratings to match, so its insert policy
-- ("using (auth.uid() = client_id)") can never be satisfied by an actual
-- client and the feature was never reachable. Never wired into any UI
-- either - found during a pre-launch review.
--
-- Fix, following the same pattern already used for tickets and
-- ticket_payments: client_id becomes nullable and untrusted, the real
-- gatekeeping (does this ticket actually belong to this phone+code, is
-- it actually resolved) happens server-side in submit-rating.js with the
-- service-role key, and there is deliberately no client-side insert
-- policy at all - same reasoning as ticket_clinical_notes.
drop policy if exists "ratings_insert_own_client" on public.ratings;
alter table public.ratings alter column client_id drop not null;

-- One rating per ticket, enforced at the database level (not just in the
-- endpoint) - the same kind of atomic guard used everywhere else in this
-- app, so a slow network + a second click can't create two ratings for
-- one consultation.
create unique index if not exists ratings_ticket_id_unique_idx on public.ratings(ticket_id);
