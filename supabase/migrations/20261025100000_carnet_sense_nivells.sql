-- Canvi de producte: el carnet de desbowlitzador ja no té nivells ni rànquings.
--   · En fer-se el carnet: 1 segell de regal.
--   · Cada comanda directa (web o local, mai plataformes): 1 paraula. Màxim 1 segell per comanda.
--   · 8 paraules = carnet complet → recompensa "postres de regal" i comença un carnet nou, buit.
--   · Cap altra recompensa. L'hora del Què Queda és per a tots els clients amb carnet.

-- ---------------------------------------------------------------------------
-- Segells: a quin carnet pertany cada paraula
-- ---------------------------------------------------------------------------

alter table public.stamps add column card_number integer;
with n as (
  select id, (row_number() over (partition by customer_id order by created_at, id) - 1) / 8 + 1 as carnet
  from public.stamps
)
update public.stamps s set card_number = n.carnet from n where n.id = s.id;
alter table public.stamps alter column card_number set not null;
alter table public.stamps add constraint stamps_card_number_check check (card_number >= 1);
create unique index stamps_carnet_paraula_idx on public.stamps (customer_id, card_number, word_id);

-- ---------------------------------------------------------------------------
-- Recompenses: només "postres de regal", una per carnet completat
-- ---------------------------------------------------------------------------

delete from public.rewards where kind <> 'postre';
alter table public.rewards drop constraint rewards_kind_check;
update public.rewards set kind = 'postres-de-regal';
alter table public.rewards alter column kind set default 'postres-de-regal';
alter table public.rewards add constraint rewards_kind_check check (kind = 'postres-de-regal');
alter table public.rewards add column card_number integer;
with n as (
  select id, row_number() over (partition by customer_id order by created_at, id) as carnet
  from public.rewards
)
update public.rewards r set card_number = n.carnet from n where n.id = r.id;
alter table public.rewards alter column card_number set not null;
create unique index rewards_carnet_idx on public.rewards (customer_id, card_number);

-- ---------------------------------------------------------------------------
-- Clients: fora el nivell (i el gènere, que només servia per a la forma del nivell)
-- ---------------------------------------------------------------------------

drop function if exists public.recalcula_nivells();
alter table public.customers drop column level;
alter table public.customers drop column gender;

-- ---------------------------------------------------------------------------
-- Carnet: mateixa funció per al simulador i per a /c/[codi]
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
  v_carnet integer;
  v_paraula smallint;
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
  v_carnet := v_total / 8 + 1;
  v_paraula := (v_total % 8) + 1;  -- la paraula següent del carnet en curs

  insert into public.stamps (customer_id, order_id, word_id, card_number, created_at)
  values (v_order.customer_id, p_order_id, v_paraula, v_carnet, p_at);
  update public.orders set qr_used_at = p_at where id = p_order_id;

  -- 8 paraules: postres de regal. El següent segell ja obre un carnet nou.
  if v_paraula = 8 then
    insert into public.rewards (customer_id, kind, card_number, created_at)
    values (v_order.customer_id, 'postres-de-regal', v_carnet, p_at);
  end if;

  return jsonb_build_object(
    'segell', true,
    'paraula', v_paraula,
    'carnet', v_carnet,
    'paraules', v_paraula,
    'carnet_complet', v_paraula = 8
  );
end;
$$;

/** En fer-se el carnet: 1 segell de regal (primera paraula del primer carnet). */
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
  insert into public.stamps (customer_id, order_id, word_id, card_number, created_at) values (p_customer_id, null, 1, 1, p_at);
end;
$$;

revoke execute on function public.registra_segell(uuid, timestamptz), public.registra_segell_regal(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.registra_segell(uuid, timestamptz), public.registra_segell_regal(uuid, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Panell: sense nivells
-- ---------------------------------------------------------------------------

create or replace function privat.panel_clients()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with avui as (select public.dia_local(now()) as d),
  ord as (
    select o.customer_id,
      count(*) as n,
      min(o.created_at) as primera,
      max(o.created_at) as ultima,
      count(*) filter (
        where extract(isodow from o.created_at at time zone 'Europe/Madrid') between 2 and 4
          and public.franja_de(o.created_at) in ('12-13', '13-14', '14-15')
      ) as laborables,
      count(*) filter (where public.franja_de(o.created_at) in ('14-15', '15-16')) as tarda,
      coalesce(sum(o.total_cents) filter (where o.created_at > now() - interval '90 days'), 0) as despesa_90
    from public.comandes_valides o
    where o.customer_id is not null
    group by o.customer_id
  ),
  st as (
    select customer_id, count(*) as n from public.stamps group by customer_id
  ),
  actual as (
    -- paraules del carnet en curs (el que encara no és complet)
    select s.customer_id, array_agg(s.word_id) as paraules
    from public.stamps s
    join st on st.customer_id = s.customer_id
    where s.card_number = st.n / 8 + 1
    group by s.customer_id
  ),
  fav as (
    select distinct on (customer_id) customer_id, nom
    from (
      select o.customer_id, d.name as nom, count(*) as n
      from public.order_items oi
      join public.comandes_valides o on o.id = oi.order_id
      join public.dishes d on d.id = oi.dish_id and d.section in ('casa', 'fes')
      where o.customer_id is not null
      group by o.customer_id, d.name
    ) x
    order by customer_id, n desc, nom
  ),
  base as (
    select c.id, c.first_name, c.last_name, c.created_at,
      (c.wallet_apple_id is not null or c.wallet_google_id is not null) as wallet,
      c.consent_email,
      coalesce(ord.n, 0) as comandes,
      ord.ultima,
      ord.laborables, ord.tarda, ord.despesa_90,
      case when ord.n > 1 then extract(epoch from ord.ultima - ord.primera) / 86400.0 / (ord.n - 1) end as interval_dies,
      (select d from avui) - public.dia_local(coalesce(ord.ultima, c.created_at)) as sense_venir,
      coalesce(st.n, 0) as segells,
      coalesce(st.n, 0) / 8 as complets,
      coalesce(st.n, 0) % 8 as paraules,
      fav.nom as preferit,
      (select w.to_word from public.words w
        where w.to_word is not null and not (w.id = any (coalesce(actual.paraules, '{}')))
        order by w.id limit 1) as li_falta
    from public.customers c
    left join ord on ord.customer_id = c.id
    left join st on st.customer_id = c.id
    left join actual on actual.customer_id = c.id
    left join fav on fav.customer_id = c.id
  ),
  amb_risc as (
    select b.*,
      case
        when b.interval_dies is null then 0
        else least(99, round(100 * (1 - exp(-(b.sense_venir / greatest(b.interval_dies, 1)) / 2.2))))
      end::int as risc,
      (b.comandes >= 4 and b.interval_dies <= 10 and b.sense_venir > 2 * b.interval_dies and b.sense_venir <= 45) as en_risc,
      (b.created_at >= now() - interval '30 days') as nou,
      (b.sense_venir > 45) as adormit
    from base b
  )
  select jsonb_build_object(
    'total_comandes_90', (select count(*) from public.comandes_valides where created_at > now() - interval '90 days'),
    'clients', (select jsonb_agg(to_jsonb(a) order by a.risc desc, a.first_name) from amb_risc a)
  );
$$;


create or replace function privat.panel_carnet()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with st as (
    select customer_id, count(*) as total,
      count(*) filter (where created_at > now() - interval '7 days' and order_id is not null) as setmana
    from public.stamps group by customer_id
  )
  select jsonb_build_object(
    'total', (select count(*) from public.customers),
    'amb_consentiment', (select count(*) from public.customers where consent_email),
    'carnets_completats', (select count(*) from public.rewards),
    'postres_setmana', (select count(*) from public.rewards where created_at > now() - interval '7 days'),
    -- paraules del carnet en curs: 1-2, 3-5 i 6-7 (a punt de completar)
    'en_curs', jsonb_build_object(
      'inici', (select count(*) from st where total % 8 between 1 and 2),
      'meitat', (select count(*) from st where total % 8 between 3 and 5),
      'a_punt', (select count(*) from st where total % 8 between 6 and 7)
    ),
    'paraules_setmana', (select coalesce(sum(setmana), 0) from st),
    'directes', (select round(avg(case when channel <> 'plataforma' then 1 else 0 end), 2) from public.comandes_valides where created_at > now() - interval '7 days')
  );
$$;
