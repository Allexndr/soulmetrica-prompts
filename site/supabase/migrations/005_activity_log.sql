-- Persistent log of user actions, payments, and reading pipeline events.
create table if not exists public.activity_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event text not null,
  level text not null default 'info'
    check (level in ('info', 'warn', 'error')),
  order_id text,
  reading_id uuid,
  user_id uuid,
  phone text,
  contact text,
  telegram_chat_id bigint,
  ip text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_event_idx on public.activity_log (event);
create index if not exists activity_log_order_idx on public.activity_log (order_id);
create index if not exists activity_log_phone_idx on public.activity_log (phone);
create index if not exists activity_log_reading_idx on public.activity_log (reading_id);

alter table public.activity_log enable row level security;
