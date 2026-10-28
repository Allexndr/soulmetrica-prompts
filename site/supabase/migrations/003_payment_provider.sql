-- Payment provider metadata on orders (Unicorn / AIPay)

alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists provider_payment_id text;
alter table public.orders add column if not exists payment_meta jsonb not null default '{}'::jsonb;

create index if not exists orders_provider_payment_idx
  on public.orders(provider_payment_id)
  where provider_payment_id is not null;

create index if not exists orders_payment_provider_idx
  on public.orders(payment_provider)
  where payment_provider is not null;
