-- ── Sellr Email Log ──────────────────────────────────────────────────
-- Migration: 010_sellr_email_log.sql
-- Tracks all transactional email send attempts for Sellr.

create table sellr_email_log (
  id               uuid        primary key default gen_random_uuid(),
  session_id       uuid        references sellr_sessions(id) on delete cascade,
  order_id         uuid        references sellr_orders(id) on delete set null,
  email_type       text        not null,
  recipient_email  text,
  success          boolean     not null default true,
  error_message    text,
  sent_at          timestamptz not null default now()
);

alter table sellr_email_log enable row level security;

-- Only service_role can read/write email logs (no anon access).
-- Service role bypasses RLS by default, so no explicit policy needed.

create index idx_sellr_email_log_session_id on sellr_email_log(session_id);
create index idx_sellr_email_log_email_type on sellr_email_log(email_type);
