-- Ticket-In: partial fix for the minors/parental-consent gap.
--
-- Not a full legal solution - there is no real identity verification of
-- either the client's age or the named guardian. What this does provide:
-- an honest, explicit question instead of silence, and a named,
-- accountable adult captured for any check-in from someone under 18,
-- visible to staff so they know they're handling a minor's case.

alter table public.tickets add column if not exists is_minor boolean not null default false;
alter table public.tickets add column if not exists guardian_name text;
alter table public.tickets add column if not exists guardian_phone text;
