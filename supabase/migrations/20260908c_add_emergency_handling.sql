-- Ticket-In: emergency handling foundation.
--
-- Per the project's own original spec: "Emergency situations must receive
-- appropriate safety handling and escalation. The platform must not
-- pretend to replace appropriate emergency or in-person care." None of
-- this existed in the initial build - adding it now before any real
-- stranger uses this.
--
-- severity was previously free text ("How severe, 1-10?" as an open
-- field) - not reliably parseable, so urgency could never be detected
-- programmatically. Adding a structured 1-10 integer alongside it.
-- Free-text severity_description is kept for the client's own words,
-- which still has real clinical value.

alter table public.tickets add column if not exists severity_level integer check (severity_level between 1 and 10);
alter table public.tickets rename column severity to severity_description;
alter table public.tickets add column if not exists emergency_disclaimer_acknowledged boolean not null default false;
