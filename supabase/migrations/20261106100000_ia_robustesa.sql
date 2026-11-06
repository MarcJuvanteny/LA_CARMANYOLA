-- IA del panell: reserves entre instàncies, quota de les accions sota demanda,
-- reintents de les peticions de campanya i dades per a la tasca nocturna.
-- Tot és només per al servidor (service role): cap política per a anon/authenticated.

-- 1. Reserves: que dues instàncies de Vercel no redactin el mateix text alhora.
create table if not exists public.ai_locks (
  key text primary key,
  until timestamptz not null
);
alter table public.ai_locks enable row level security;

create or replace function public.ia_reserva(p_clau text, p_segons integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  insert into public.ai_locks as l (key, until)
  values (p_clau, now() + make_interval(secs => p_segons))
  on conflict (key) do update set until = excluded.until
  where l.until < now();
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- 2. Quota: quantes crides sota demanda (botons del panell) es poden fer en una finestra.
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  action text not null,
  at timestamptz not null default now()
);
alter table public.ai_usage enable row level security;
create index if not exists ai_usage_at on public.ai_usage (at);

create or replace function public.ia_quota(p_accio text, p_maxim integer, p_minuts integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  perform pg_advisory_xact_lock(hashtext('ia_quota'));
  delete from public.ai_usage where at < now() - interval '1 day';
  select count(*) into n from public.ai_usage where at > now() - make_interval(mins => p_minuts);
  if n >= p_maxim then
    return false;
  end if;
  insert into public.ai_usage (action) values (p_accio);
  return true;
end;
$$;

-- 3. Peticions de campanya: la tasca nocturna les reintenta (com a molt 3 vegades).
alter table public.campaign_requests add column if not exists attempts smallint not null default 0;

-- 4. La tasca nocturna no té sessió d'amo: llegeix els mateixos agregats amb la service role.
create or replace function public.ia_panel_clients()
returns jsonb language sql stable security definer set search_path = '' as $$
  select privat.panel_clients();
$$;

create or replace function public.ia_panel_franges()
returns jsonb language sql stable security definer set search_path = '' as $$
  select privat.panel_franges();
$$;

revoke execute on function public.ia_reserva(text, integer), public.ia_quota(text, integer, integer),
  public.ia_panel_clients(), public.ia_panel_franges() from public, anon, authenticated;
grant execute on function public.ia_reserva(text, integer), public.ia_quota(text, integer, integer),
  public.ia_panel_clients(), public.ia_panel_franges() to service_role;
