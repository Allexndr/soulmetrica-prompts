-- Admin OS: roles, prices, settings, audit
-- Applied manually / via this file for new envs.

alter table public.users add column if not exists role text not null default 'user';
do $$ begin
  alter table public.users add constraint users_role_check check (role in ('user','admin'));
exception when duplicate_object then null; end $$;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists notes text;
alter table public.users add column if not exists is_blocked boolean not null default false;

create table if not exists public.product_prices (
  product_key text primary key,
  name text not null,
  amount_tenge integer not null check (amount_tenge >= 30),
  active boolean not null default true,
  sort_order integer not null default 100,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  meta jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
create index if not exists users_role_idx on public.users(role);
create index if not exists users_phone_idx on public.users(phone);

alter table public.product_prices enable row level security;
alter table public.app_settings enable row level security;
alter table public.admin_audit_log enable row level security;

insert into public.product_prices (product_key, name, amount_tenge, sort_order) values
  ('full', 'Полный разбор', 15000, 10),
  ('money', 'Денежный код', 3990, 20),
  ('love', 'Сценарий любви', 3990, 30),
  ('forecast', 'Прогноз 2026', 3990, 40),
  ('realization', 'Реализация', 4990, 50),
  ('blocks', 'Скрытые блоки', 4990, 60),
  ('compatibility', 'Совместимость пары', 3990, 70),
  ('destiny', 'Число судьбы', 1990, 80)
on conflict (product_key) do nothing;

insert into public.app_settings (key, value) values
  ('checkout', '{"force_test_sum":30,"test_mode":true}'::jsonb)
on conflict (key) do nothing;
