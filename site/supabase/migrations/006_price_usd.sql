-- Separate EN market prices in USD (display + convert to KZT at checkout).
alter table public.product_prices
  add column if not exists amount_usd integer
  check (amount_usd is null or amount_usd >= 1);

comment on column public.product_prices.amount_usd is
  'EN catalog price in whole USD. Null = fall back to amount_tenge.';

-- Sensible starter USD catalog (~psychological EN prices). Admin can edit.
update public.product_prices set amount_usd = 29 where product_key = 'full' and amount_usd is null;
update public.product_prices set amount_usd = 12 where product_key = 'money' and amount_usd is null;
update public.product_prices set amount_usd = 15 where product_key = 'love' and amount_usd is null;
update public.product_prices set amount_usd = 12 where product_key = 'forecast' and amount_usd is null;
update public.product_prices set amount_usd = 12 where product_key = 'realization' and amount_usd is null;
update public.product_prices set amount_usd = 12 where product_key = 'blocks' and amount_usd is null;
update public.product_prices set amount_usd = 19 where product_key = 'compatibility' and amount_usd is null;
update public.product_prices set amount_usd = 12 where product_key = 'child' and amount_usd is null;
update public.product_prices set amount_usd = 7 where product_key = 'destiny' and amount_usd is null;
