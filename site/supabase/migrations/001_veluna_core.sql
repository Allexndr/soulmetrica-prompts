-- Veluna: users, sessions, orders, readings, rate limits
-- Run once in Supabase SQL editor or via psql.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  password_hash text,
  display_name text,
  telegram_id bigint unique,
  telegram_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_or_telegram check (email is not null or telegram_id is not null)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_idx on public.sessions(user_id);
create index if not exists sessions_expires_idx on public.sessions(expires_at);

create table if not exists public.orders (
  id text primary key,
  user_id uuid references public.users(id) on delete set null,
  product text not null,
  addons jsonb not null default '[]'::jsonb,
  amount integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'failed')),
  customer_name text,
  phone text,
  contact text,
  birth_day smallint,
  birth_month smallint,
  birth_year smallint,
  birth_time text,
  birth_city text,
  gender text not null default 'unknown',
  telegram_chat_id bigint,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_phone_idx on public.orders(phone);

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  product_key text not null,
  title text not null,
  status text not null default 'queued'
    check (status in ('queued', 'generating', 'ready', 'failed')),
  blocks_total integer not null default 0,
  blocks_done integer not null default 0,
  blocks_content jsonb not null default '[]'::jsonb,
  content_text text,
  file_url text,
  telegram_delivered_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists readings_order_product_idx
  on public.readings(order_id, product_key);

create table if not exists public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (bucket, window_start)
);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.orders enable row level security;
alter table public.readings enable row level security;
alter table public.rate_limits enable row level security;

-- No policies: anon/authenticated denied; service_role bypasses RLS.
