-- Funnel / target analytics: visitor id + source on activity_log
alter table public.activity_log
  add column if not exists visitor_id text,
  add column if not exists source text;

create index if not exists activity_log_visitor_idx
  on public.activity_log (visitor_id, created_at desc)
  where visitor_id is not null;

create index if not exists activity_log_funnel_event_idx
  on public.activity_log (event, created_at desc)
  where event like 'funnel.%' or event like 'tg.%';
