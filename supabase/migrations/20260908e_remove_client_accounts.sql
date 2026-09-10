-- Ticket-In: remove the client account requirement entirely.
--
-- Real adoption-fit issue raised directly: requiring email+password
-- registration for a Cameroonian healthcare-consultation audience is a
-- genuine barrier - many people don't have or regularly use email.
-- Clients now check in with just a phone number, no account at all.
-- Staff and admin still require real accounts (credential verification
-- and admin security genuinely need that).
--
-- Tickets are now identified by client_phone + a system-generated
-- client_code (shown once on screen after check-in) instead of a
-- client_id tied to a real auth.users row. All three new endpoints
-- (submit-checkin, lookup-ticket, submit-checkin-payment) are
-- deliberately unauthenticated - that IS the fix.

alter table public.tickets alter column client_id drop not null;
alter table public.tickets add column if not exists client_phone text;
alter table public.tickets add column if not exists client_code text unique;

alter table public.ticket_payments alter column client_id drop not null;

create index if not exists idx_tickets_phone_code on public.tickets(client_phone, client_code);
