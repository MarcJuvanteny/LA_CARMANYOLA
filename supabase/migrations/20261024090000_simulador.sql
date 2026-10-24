-- La Carmanyola · simulador v2
-- La lògica de la simulació viu a TypeScript (src/lib/sim). Aquí hi ha:
--   · l'esquema que necessita (perfils ocults, franges executades, cancel·lacions…)
--   · registra_segell(): la MATEIXA lògica de carnet que farà servir el flux real (/c/[codi])
--   · sim_apply_slot(): aplica una franja de 15 minuts en una sola transacció, sense duplicats

-- ---------------------------------------------------------------------------
-- Fora el simulador SQL antic
-- ---------------------------------------------------------------------------

do $$ begin perform cron.unschedule('restaurant-viu'); exception when others then null; end $$;

drop function if exists public.posa_al_dia();
drop function if exists public.simula_comanda_ara();
drop function if exists public.sim_fins(timestamptz);
drop function if exists public.sim_franja(date, text, timestamptz, timestamptz);
drop function if exists public.sim_comanda(timestamptz);
drop function if exists public.sim_tria_plat(timestamptz, text);
drop function if exists public.sim_tria_client(timestamptz);
drop function if exists public.sim_afinitat(text, integer, text);
drop function if exists public.prepara_produccio(date);
drop table if exists public.sim_rates;
drop table if exists public.sim_config;
drop table if exists public.sim_profiles;

-- ---------------------------------------------------------------------------
-- Esquema
-- ---------------------------------------------------------------------------

-- Comandes: cancel·lacions
alter table public.orders
  add column status text not null default 'confirmada' check (status in ('confirmada', 'cancel·lada')),
  add column cancelled_at timestamptz;

-- Clients: el perfil del seed ja no és visible per al panell; el nivell es desa.
alter table public.customers drop column if exists profile;
alter table public.customers
  add column level text not null default 'aprenent' check (level in ('aprenent', 'desbowlitzador', 'mestre', 'honor'));

-- Campanyes: marca de simulació i finestra del segell doble
alter table public.campaigns
  add column simulated boolean not null default false,
  add column double_days smallint[],          -- dies ISO (1 = dilluns)
  add column double_from time,
  add column double_to time,
  add column starts_on date,
  add column ends_on date;

-- Què Queda: el que ha quedat de veritat en tancar el servei
alter table public.leftovers
  add column remaining smallint,
  add column computed_at timestamptz;

alter table public.holidays add column source text;

-- Perfils ocults: RLS sense cap política → només la service role els veu.
create table public.sim_profiles (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  profile text not null check (profile in ('oficinista', 'ocasional', 'vega', 'familia', 'desertor')),
  weekly_rate numeric(4, 2) not null,
  days smallint[] not null,                   -- dies ISO en què sol demanar
  service text not null check (service in ('dinar', 'sopar')),
  favourite_dish_ids smallint[] not null,
  scan_prob numeric(3, 2) not null,
  churns_at date
);
alter table public.sim_profiles enable row level security;

-- Franges ja simulades: garantia de no duplicar.
create table public.sim_runs (
  slot_start timestamptz primary key,
  orders_created integer not null,
  created_at timestamptz not null default now()
);
alter table public.sim_runs enable row level security;

-- Comandes que compten per al panell: sense cancel·lades i situades a l'hora de recollida.
create or replace view public.comandes_valides
with (security_invoker = true) as
select
  o.id, o.customer_id, o.channel,
  coalesce(o.pickup_at, o.created_at) as created_at,
  o.pickup_at, o.total_cents, o.dinar, o.qr_code, o.qr_used_at, o.stripe_session_id, o.simulated
from public.orders o
where o.status = 'confirmada';

-- ---------------------------------------------------------------------------
-- Horari nou: dinar 12:30-16:00, sopar 19:30-22:30 (franges horàries del panell)
-- ---------------------------------------------------------------------------

create or replace function public.franja_de(ts timestamptz)
returns text language sql stable set search_path = '' as $$
  select case extract(hour from ts at time zone 'Europe/Madrid')::int
    when 12 then '12-13' when 13 then '13-14' when 14 then '14-15' when 15 then '15-16'
    when 19 then '19-20' when 20 then '20-21' when 21 then '21-22' when 22 then '22-23'
  end;
$$;

create or replace function public.servei_de_franja(p_slot text)
returns text language sql immutable set search_path = '' as $$
  select case when p_slot in ('19-20', '20-21', '21-22', '22-23') then 'vespre' when p_slot is not null then 'migdia' end;
$$;

-- ---------------------------------------------------------------------------
-- Carnet: un segell per comanda directa. Mateixa funció per al simulador i per a /c/[codi].
-- Regles (CONTEXT.md §5): 8 paraules = carnet complet → postre.
-- Nivells: 1 carnet = desbowlitzador · 3 carnets = mestre (+ carmanyola reutilitzable).
-- Desbowlitzador d'honor: criteri pendent de decidir (no s'assigna).
-- ---------------------------------------------------------------------------

create or replace function public.registra_segell(p_order_id uuid, p_at timestamptz default now())
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_total integer;
  v_word smallint;
  v_complets integer;
  v_level text;
begin
  select id, customer_id, channel, status into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null or v_order.customer_id is null or v_order.channel = 'plataforma' or v_order.status <> 'confirmada' then
    return jsonb_build_object('segell', false);
  end if;
  if exists (select 1 from public.stamps where order_id = p_order_id) then
    return jsonb_build_object('segell', false, 'motiu', 'ja registrat');
  end if;

  perform pg_advisory_xact_lock(hashtext('carnet:' || v_order.customer_id::text));
  select count(*) into v_total from public.stamps where customer_id = v_order.customer_id;
  -- La paraula següent del carnet en curs (1..8)
  v_word := (v_total % 8) + 1;

  insert into public.stamps (customer_id, order_id, word_id, created_at) values (v_order.customer_id, p_order_id, v_word, p_at);
  update public.orders set qr_used_at = p_at where id = p_order_id;
  v_total := v_total + 1;
  v_complets := v_total / 8;

  if v_total % 8 = 0 then
    insert into public.rewards (customer_id, kind, created_at) values (v_order.customer_id, 'postre', p_at);
    if v_complets = 3 then
      insert into public.rewards (customer_id, kind, created_at) values (v_order.customer_id, 'carmanyola-reutilitzable', p_at);
    end if;
  end if;

  v_level := case when v_complets >= 3 then 'mestre' when v_complets >= 1 then 'desbowlitzador' else 'aprenent' end;
  update public.customers set level = v_level where id = v_order.customer_id and level is distinct from v_level and level <> 'honor';

  return jsonb_build_object('segell', true, 'paraula', v_word, 'segells', v_total, 'nivell', v_level);
end;
$$;

/** Segell de regal en donar-se d'alta (Aprenent). */
create or replace function public.registra_segell_regal(p_customer_id uuid, p_at timestamptz default now())
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.stamps where customer_id = p_customer_id) then
    return;
  end if;
  insert into public.stamps (customer_id, order_id, word_id, created_at) values (p_customer_id, null, 1, p_at);
  insert into public.rewards (customer_id, kind, created_at) values (p_customer_id, 'segell-regal', p_at);
end;
$$;

create or replace function public.recalcula_nivells()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  with n as (
    select c.id,
      case when coalesce(s.total, 0) / 8 >= 3 then 'mestre' when coalesce(s.total, 0) / 8 >= 1 then 'desbowlitzador' else 'aprenent' end as level
    from public.customers c
    left join (select customer_id, count(*) as total from public.stamps group by customer_id) s on s.customer_id = c.id
    where c.level <> 'honor'
  ),
  u as (
    update public.customers c set level = n.level from n where n.id = c.id and c.level is distinct from n.level returning 1
  )
  select count(*)::int from u;
$$;

-- ---------------------------------------------------------------------------
-- Producció del servei (el que es cuina): mitjana dels 4 mateixos dies + 12 %
-- ---------------------------------------------------------------------------

create or replace function public.prepara_produccio(p_day date, p_service text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_inici integer := case p_service when 'migdia' then 12 * 60 + 30 else 19 * 60 + 30 end;
  v_fi integer := case p_service when 'migdia' then 16 * 60 else 22 * 60 + 30 end;
begin
  insert into public.leftovers (day, service, dish_id, made)
  select p_day, p_service, d.id,
    coalesce(
      (select pp.planned from public.production_plans pp
        where pp.day = p_day and pp.dish_id = d.id and pp.status = 'enviat' and p_service = 'migdia'),
      greatest(4, round(coalesce(h.mitjana, case p_service when 'migdia' then 10 else 5 end) * 1.12) + 1)
    )::smallint
  from public.dishes d
  left join lateral (
    select avg(t.n) as mitjana
    from (
      select coalesce(sum(oi.qty), 0) as n
      from generate_series(1, 4) as k
      left join public.comandes_valides o
        on o.created_at >= public.moment_local(p_day - 7 * k, v_inici)
       and o.created_at < public.moment_local(p_day - 7 * k, v_fi)
      left join public.order_items oi on oi.order_id = o.id and oi.dish_id = d.id
      group by k
    ) t
  ) h on true
  where d.section = 'casa'
  on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Aplicar una franja de 15 minuts: tot o res, i mai dues vegades.
-- p_payload = { "service": "migdia"|"vespre", "first_of_service": bool,
--               "orders": [{ id, customer_id, channel, created_at, pickup_at, dinar, total_cents,
--                            status, cancelled_at, qr_code, scan, items: [{ dish_id, qty, unit_price_cents }] }] }
-- ---------------------------------------------------------------------------

create or replace function public.sim_apply_slot(p_slot timestamptz, p_payload jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_n integer := 0;
  v_order jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('carmanyola:sim'));
  if exists (select 1 from public.sim_runs where slot_start = p_slot) then
    return -1;  -- ja simulada
  end if;

  if coalesce((p_payload ->> 'first_of_service')::boolean, false) then
    perform public.prepara_produccio(public.dia_local(p_slot), p_payload ->> 'service');
  end if;

  for v_order in select * from jsonb_array_elements(coalesce(p_payload -> 'orders', '[]'::jsonb)) loop
    insert into public.orders (id, customer_id, channel, created_at, pickup_at, total_cents, dinar, qr_code, status, cancelled_at, simulated)
    values (
      (v_order ->> 'id')::uuid,
      nullif(v_order ->> 'customer_id', '')::uuid,
      v_order ->> 'channel',
      (v_order ->> 'created_at')::timestamptz,
      (v_order ->> 'pickup_at')::timestamptz,
      (v_order ->> 'total_cents')::integer,
      (v_order ->> 'dinar')::boolean,
      nullif(v_order ->> 'qr_code', ''),
      v_order ->> 'status',
      nullif(v_order ->> 'cancelled_at', '')::timestamptz,
      true
    );
    insert into public.order_items (order_id, dish_id, qty, unit_price_cents)
    select (v_order ->> 'id')::uuid, i.dish_id, i.qty, i.unit_price_cents
    from jsonb_to_recordset(v_order -> 'items') as i (dish_id smallint, qty smallint, unit_price_cents integer);

    if coalesce((v_order ->> 'scan')::boolean, false) then
      perform public.registra_segell((v_order ->> 'id')::uuid, (v_order ->> 'pickup_at')::timestamptz + interval '20 minutes');
    end if;
    v_n := v_n + 1;
  end loop;

  insert into public.sim_runs (slot_start, orders_created) values (p_slot, v_n);
  return v_n;
end;
$$;

-- Funcions internes: només la service role (i postgres per al cron).
revoke execute on function public.registra_segell(uuid, timestamptz), public.registra_segell_regal(uuid, timestamptz),
  public.recalcula_nivells(), public.prepara_produccio(date, text), public.sim_apply_slot(timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.registra_segell(uuid, timestamptz), public.registra_segell_regal(uuid, timestamptz),
  public.recalcula_nivells(), public.prepara_produccio(date, text), public.sim_apply_slot(timestamptz, jsonb)
  to service_role;
grant select on public.comandes_valides to authenticated, service_role;
