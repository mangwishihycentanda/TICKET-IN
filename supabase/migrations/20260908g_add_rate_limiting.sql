-- Ticket-In: rate limiting for public unauthenticated endpoints.
--
-- Real gap: submit-checkin, lookup-ticket, submit-checkin-payment, and
-- get-momo-details are all deliberately open with no auth (that's the
-- whole design) - but that also means nothing currently stops someone
-- from spamming fake check-ins, or brute-forcing a client code against
-- a known phone number. Low risk at zero real traffic, real risk at
-- public launch.
--
-- Database-backed rather than a separate Redis/KV service - "build
-- less": this is simple enough not to need new infrastructure, and
-- traffic volume at this stage doesn't call for anything more
-- sophisticated.

create table public.request_log (
  id bigint generated always as identity primary key,
  rate_key text not null,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index idx_request_log_lookup on public.request_log(rate_key, endpoint, created_at);

alter table public.request_log enable row level security;
-- Deliberately zero policies - this table is only ever touched via
-- service role from server-side rate-limit checks, which bypasses RLS
-- entirely. No anon/authenticated access should ever be needed.
