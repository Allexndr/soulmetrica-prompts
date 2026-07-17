-- Language selected at checkout. Existing orders remain Russian.
alter table public.orders
  add column if not exists language text not null default 'ru';

alter table public.orders
  drop constraint if exists orders_language_check;

alter table public.orders
  add constraint orders_language_check check (language in ('ru', 'en'));
