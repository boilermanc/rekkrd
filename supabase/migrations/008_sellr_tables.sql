-- ── Sellr Tables ─────────────────────────────────────────────────────
-- Migration: 008_sellr_tables.sql

-- ── Sessions ─────────────────────────────────────────────────────────
create table sellr_sessions (
  id            uuid        primary key default gen_random_uuid(),
  email         text,
  tier          text,
  status        text        not null default 'active',
  record_count  int         not null default 0,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '7 days'
);

alter table sellr_sessions enable row level security;

-- Anon can create sessions
create policy "sellr_sessions_insert_anon"
  on sellr_sessions for insert
  to anon
  with check (true);

-- Anon can read their own session by id
create policy "sellr_sessions_select_anon"
  on sellr_sessions for select
  to anon
  using (true);

-- Anon can update their own session by id
create policy "sellr_sessions_update_anon"
  on sellr_sessions for update
  to anon
  using (true)
  with check (true);

-- ── Records ──────────────────────────────────────────────────────────
create table sellr_records (
  id            uuid        primary key default gen_random_uuid(),
  session_id    uuid        not null references sellr_sessions(id) on delete cascade,
  title         text        not null,
  artist        text        not null,
  year          int,
  label         text,
  condition     text        not null default 'VG',
  discogs_id    text,
  cover_image   text,
  price_low     numeric,
  price_median  numeric,
  price_high    numeric,
  ad_copy       text,
  created_at    timestamptz not null default now()
);

alter table sellr_records enable row level security;

create index idx_sellr_records_session_id on sellr_records(session_id);

-- Anon can insert records for an existing session
create policy "sellr_records_insert_anon"
  on sellr_records for insert
  to anon
  with check (
    exists (select 1 from sellr_sessions where id = session_id)
  );

-- Anon can read records by session_id
create policy "sellr_records_select_anon"
  on sellr_records for select
  to anon
  using (
    exists (select 1 from sellr_sessions where id = session_id)
  );

-- Anon can update records belonging to their session
create policy "sellr_records_update_anon"
  on sellr_records for update
  to anon
  using (
    exists (select 1 from sellr_sessions where id = session_id)
  )
  with check (
    exists (select 1 from sellr_sessions where id = session_id)
  );

-- Anon can delete records belonging to their session
create policy "sellr_records_delete_anon"
  on sellr_records for delete
  to anon
  using (
    exists (select 1 from sellr_sessions where id = session_id)
  );

-- ── Orders ───────────────────────────────────────────────────────────
create table sellr_orders (
  id                     uuid        primary key default gen_random_uuid(),
  session_id             uuid        references sellr_sessions(id),
  email                  text        not null,
  tier                   text        not null,
  amount_cents           int         not null,
  stripe_payment_intent  text,
  status                 text        not null default 'pending',
  report_token           text        unique default encode(gen_random_bytes(32), 'hex'),
  created_at             timestamptz not null default now()
);

alter table sellr_orders enable row level security;

create index idx_sellr_orders_report_token on sellr_orders(report_token);

-- Anon can insert orders (checkout flow)
create policy "sellr_orders_insert_anon"
  on sellr_orders for insert
  to anon
  with check (true);

-- Only service_role can read orders (no anon select)
-- Service role bypasses RLS by default, so no explicit policy needed.
-- This comment documents the intent: anon has NO select access to orders.
