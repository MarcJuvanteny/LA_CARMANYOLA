-- La Carmanyola · restaurant viu (CONTEXT.md §10)
-- Un sol motor genera la història de 6 mesos (seed) i les comandes en directe (pg_cron),
-- de manera que els patrons amagats són els mateixos a tot arreu:
--   · dimarts i dimecres al vespre fluixos, divendres forts
--   · el fricandó puja quan plou; els plats freds baixen a la tardor
--   · els oficinistes demanen de dimarts a dijous al migdia; les famílies, dissabte

-- ---------------------------------------------------------------------------
-- Paràmetres
-- ---------------------------------------------------------------------------

create table public.sim_config (
  key text primary key,
  value text not null
);

-- Comandes per hora (mitjana) segons dia ISO (1 = dilluns) i franja.
create table public.sim_rates (
  dow smallint not null check (dow between 1 and 6),
  slot text not null,
  rate numeric not null,
  primary key (dow, slot)
);

insert into public.sim_rates (dow, slot, rate) values
  (1, '12-13', 16), (1, '13-14', 24), (1, '14-15', 13), (1, '15-16', 3), (1, '20-21', 7),  (1, '21-22', 6),
  (2, '12-13', 15), (2, '13-14', 22), (2, '14-15', 12), (2, '15-16', 2), (2, '20-21', 3),  (2, '21-22', 2.5),
  (3, '12-13', 15), (3, '13-14', 23), (3, '14-15', 12), (3, '15-16', 2), (3, '20-21', 3.3),(3, '21-22', 2.7),
  (4, '12-13', 17), (4, '13-14', 25), (4, '14-15', 14), (4, '15-16', 3), (4, '20-21', 8),  (4, '21-22', 7),
  (5, '12-13', 19), (5, '13-14', 26), (5, '14-15', 15), (5, '15-16', 4), (5, '20-21', 13), (5, '21-22', 11),
  (6, '12-13', 10), (6, '13-14', 17), (6, '14-15', 15), (6, '15-16', 5), (6, '20-21', 14), (6, '21-22', 12);

-- Perfil de cada client simulat.
create table public.sim_profiles (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  profile text not null check (profile in ('oficinista', 'ocasional', 'vega', 'familia', 'deixa', 'estiu')),
  weight numeric not null default 1,
  active_from date not null,
  active_to date                       -- els que deixen de venir
);

alter table public.sim_config enable row level security;
alter table public.sim_rates enable row level security;
alter table public.sim_profiles enable row level security;
create policy "amo: tot" on public.sim_config for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "amo: tot" on public.sim_rates for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "amo: tot" on public.sim_profiles for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

-- ---------------------------------------------------------------------------
-- Ajudes de temps (tot en hora de Barcelona)
-- ---------------------------------------------------------------------------

create or replace function public.dia_local(ts timestamptz)
returns date language sql stable set search_path = '' as $$
  select (ts at time zone 'Europe/Madrid')::date;
$$;

create or replace function public.franja_de(ts timestamptz)
returns text language sql stable set search_path = '' as $$
  select case extract(hour from ts at time zone 'Europe/Madrid')::int
    when 12 then '12-13' when 13 then '13-14' when 14 then '14-15' when 15 then '15-16'
    when 20 then '20-21' when 21 then '21-22'
  end;
$$;

create or replace function public.servei_de_franja(p_slot text)
returns text language sql immutable set search_path = '' as $$
  select case when p_slot in ('20-21', '21-22') then 'vespre' when p_slot is not null then 'migdia' end;
$$;

/** Hora local (dia + hora:minut) → timestamptz */
create or replace function public.moment_local(p_day date, p_minuts integer)
returns timestamptz language sql stable set search_path = '' as $$
  select (p_day + make_interval(mins => p_minuts)) at time zone 'Europe/Madrid';
$$;

-- ---------------------------------------------------------------------------
-- Tria de plat i de client
-- ---------------------------------------------------------------------------

create or replace function public.sim_afinitat(p_profile text, p_dow integer, p_slot text)
returns numeric language sql immutable set search_path = '' as $$
  select case
    when p_profile in ('oficinista', 'deixa') then
      case
        when p_dow between 2 and 4 and p_slot in ('12-13', '13-14', '14-15') then 3
        when p_dow in (1, 5) and p_slot in ('12-13', '13-14', '14-15') then 1
        when p_dow = 6 then 0.1
        else 0.25
      end
    when p_profile = 'familia' then case when p_dow = 6 then 4 else 0.15 end
    else 1
  end;
$$;

/** Plat de la casa segons temporada, pluja, perfil i el que queda a cuina. */
create or replace function public.sim_tria_plat(p_at timestamptz, p_profile text)
returns smallint
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_day date := public.dia_local(p_at);
  v_md integer := extract(month from v_day)::int * 100 + extract(day from v_day)::int;
  v_tardor boolean := v_md between 922 and 1221;
  v_estiu boolean := v_md between 621 and 921;
  v_pluja boolean := coalesce((select w.rain_mm from public.weather_daily w where w.day = v_day), 0) >= 1;
  v_servei text := public.servei_de_franja(public.franja_de(p_at));
  v_id smallint;
begin
  select d.id into v_id
  from public.dishes d
  join (values
    ('la-de-sempre', 1.0),
    ('pollastre-de-diumenge', 0.85),
    ('l-esqueixat', case when v_estiu then 1.25 when v_tardor then 0.5 else 0.8 end),
    ('tot-escalivat', case when p_profile = 'vega' then 6 else 0.75 end),
    ('fricando-amb-bolets', case when not v_tardor then 0 when v_pluja then 2.1 else 1.25 end),
    ('la-castanyera', case when v_tardor then 1.0 else 0 end),
    ('fes-te-l-tu', 0.18)
  ) as w (slug, weight) on w.slug = d.slug
  where w.weight > 0
    -- si hi ha producció planificada, no es pot vendre el que s'ha esgotat
    and not exists (
      select 1
      from public.leftovers l
      where l.day = v_day and l.service = v_servei and l.dish_id = d.id
        and l.made <= (
          select coalesce(sum(oi.qty), 0)
          from public.order_items oi
          join public.orders o on o.id = oi.order_id
          where oi.dish_id = d.id
            and o.created_at >= public.moment_local(v_day, 0)
            and o.created_at < public.moment_local(v_day + 1, 0)
            and public.servei_de_franja(public.franja_de(o.created_at)) = v_servei
        )
    )
  order by -ln(1 - random()) / w.weight
  limit 1;
  return v_id;
end;
$$;

create or replace function public.sim_tria_client(p_at timestamptz)
returns uuid
language sql
volatile
set search_path = ''
as $$
  select p.customer_id
  from public.sim_profiles p
  join public.customers c on c.id = p.customer_id
  where c.created_at <= p_at
    and public.dia_local(p_at) >= p.active_from
    and (p.active_to is null or public.dia_local(p_at) <= p.active_to)
  order by -ln(1 - random()) / (
    p.weight
    * public.sim_afinitat(p.profile, extract(isodow from p_at at time zone 'Europe/Madrid')::int, public.franja_de(p_at))
    -- l'efecte d'una campanya: qui rep l'avís torna més els 14 dies següents
    * case when exists (
        select 1
        from public.campaign_recipients cr
        join public.campaigns ca on ca.id = cr.campaign_id
        where cr.customer_id = p.customer_id and not cr.control
          and ca.sent_at between p_at - interval '14 days' and p_at
      ) then 3 else 1 end
  )
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Una comanda
-- ---------------------------------------------------------------------------

create or replace function public.sim_comanda(p_at timestamptz)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_r numeric := random();
  v_channel text := case when v_r < 0.30 then 'plataforma' when v_r < 0.78 then 'web' else 'local' end;
  v_customer uuid;
  v_profile text;
  v_order uuid;
  v_n integer := 1;
  v_dish smallint;
  v_price integer;
  v_total integer := 0;
  v_dinar boolean := random() < 0.36;
  v_word smallint;
  v_stamps integer;
begin
  -- Les plataformes no ens diuen qui és; demanant directe, 7 de cada 10 tenen carnet.
  if v_channel <> 'plataforma' and random() < 0.7 then
    v_customer := public.sim_tria_client(p_at);
    select profile into v_profile from public.sim_profiles where customer_id = v_customer;
  end if;

  if v_profile = 'familia' then
    v_n := 2 + floor(random() * 3)::int;
  elsif random() < 0.08 then
    v_n := 2;
  end if;

  insert into public.orders (customer_id, channel, created_at, pickup_at, qr_code, simulated)
  values (
    v_customer, v_channel, p_at, p_at + interval '15 minutes',
    case when v_channel <> 'plataforma' then substr(md5(gen_random_uuid()::text), 1, 12) end,
    true
  )
  returning id into v_order;

  for i in 1..v_n loop
    v_dish := public.sim_tria_plat(p_at, v_profile);
    exit when v_dish is null;  -- tot esgotat
    select price_cents into v_price from public.dishes where id = v_dish;
    insert into public.order_items (order_id, dish_id, qty, unit_price_cents) values (v_order, v_dish, 1, v_price);
    v_total := v_total + v_price;
  end loop;

  if v_total = 0 then
    delete from public.orders where id = v_order;
    return null;
  end if;

  -- El Dinar: beguda o postre per +2 €
  if v_dinar then
    insert into public.order_items (order_id, dish_id, qty, unit_price_cents)
    select v_order, id, 1, 0 from public.dishes where section in ('postres', 'begudes') order by random() limit 1;
    v_total := v_total + 200;
  end if;

  -- Per acompanyar i begudes pagades a part
  if random() < 0.22 then
    insert into public.order_items (order_id, dish_id, qty, unit_price_cents)
    select v_order, id, 1, price_cents from public.dishes where section = 'acompanyar' order by random() limit 1
    returning unit_price_cents into v_price;
    v_total := v_total + v_price;
  end if;
  if not v_dinar and random() < 0.18 then
    insert into public.order_items (order_id, dish_id, qty, unit_price_cents)
    select v_order, id, 1, price_cents from public.dishes where section = 'begudes' order by random() limit 1
    returning unit_price_cents into v_price;
    v_total := v_total + v_price;
  end if;

  update public.orders set total_cents = v_total, dinar = v_dinar where id = v_order;

  -- Carnet: un segell per comanda directa, amb una paraula que encara no té al carnet actual
  if v_customer is not null then
    select count(*) into v_stamps from public.stamps where customer_id = v_customer;
    select w.id into v_word
    from public.words w
    where w.id not in (
      select s.word_id
      from (
        select word_id, row_number() over (order by created_at, id) as rn
        from public.stamps where customer_id = v_customer
      ) s
      where s.rn > v_stamps - (v_stamps % 8)
    )
    order by random()
    limit 1;

    insert into public.stamps (customer_id, order_id, word_id, created_at) values (v_customer, v_order, v_word, p_at);
    if (v_stamps + 1) % 8 = 0 then
      insert into public.rewards (customer_id, kind, created_at) values (v_customer, 'postre', p_at);
    end if;
  end if;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Producció del dia: el que es cuina al matí (mitjana dels 4 mateixos dies + 12 %)
-- ---------------------------------------------------------------------------

create or replace function public.prepara_produccio(p_day date)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  if extract(isodow from p_day) = 7 then
    return;
  end if;

  insert into public.leftovers (day, service, dish_id, made)
  select p_day, s.service, d.id,
    coalesce(
      (select pp.planned from public.production_plans pp
        where pp.day = p_day and pp.dish_id = d.id and pp.status = 'enviat' and s.service = 'migdia'),
      greatest(4, round(coalesce(h.mitjana, case s.service when 'migdia' then 9 else 3 end) * 1.12) + 1)
    )::smallint
  from public.dishes d
  cross join (values ('migdia'), ('vespre')) as s (service)
  left join lateral (
    select avg(t.n) as mitjana
    from (
      select coalesce(sum(oi.qty), 0) as n
      from generate_series(1, 4) as k
      left join public.orders o
        on o.created_at >= public.moment_local(p_day - 7 * k, 0)
       and o.created_at < public.moment_local(p_day - 7 * k + 1, 0)
       and public.servei_de_franja(public.franja_de(o.created_at)) = s.service
      left join public.order_items oi on oi.order_id = o.id and oi.dish_id = d.id
      group by k
    ) t
  ) h on true
  where d.section = 'casa'
  on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Avançar el rellotge: genera les comandes entre l'últim tic i p_until
-- ---------------------------------------------------------------------------

create or replace function public.sim_franja(p_day date, p_slot text, p_since timestamptz, p_until timestamptz)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_dow integer := extract(isodow from p_day)::int;
  v_hour integer := split_part(p_slot, '-', 1)::int;
  v_rate numeric;
  v_factor numeric := 1;
  v_obertura date := coalesce((select value::date from public.sim_config where key = 'obertura'), p_day - 183);
  v_lambda numeric;
  v_n integer;
  v_at timestamptz;
  v_count integer := 0;
begin
  select rate into v_rate from public.sim_rates where dow = v_dow and slot = p_slot;
  if v_rate is null then
    return 0;
  end if;

  -- El restaurant creix: obre al 72 % i arriba al 100 % en sis mesos.
  v_factor := 0.72 + 0.28 * least(1, greatest(0, (p_day - v_obertura) / 183.0));
  -- Festius: sense oficines, el migdia baixa.
  if exists (select 1 from public.holidays h where h.day = p_day) then
    v_factor := v_factor * case when v_hour < 17 then 0.5 else 1.1 end;
  end if;
  -- Agost: el 22@ es buida.
  if extract(month from p_day) = 8 then
    v_factor := v_factor * 0.7;
  end if;
  -- Pluja: una mica menys de gent, però més fricandó (vegeu sim_tria_plat).
  if coalesce((select w.rain_mm from public.weather_daily w where w.day = p_day), 0) >= 2 then
    v_factor := v_factor * 0.93;
  end if;
  -- La prova del segell doble dels dilluns al vespre: +38 % les tres setmanes que va durar.
  if v_dow = 1 and v_hour >= 20 and exists (
    select 1 from public.campaigns c
    where c.kind = 'franja' and c.status = 'enviada'
      and p_day between public.dia_local(c.sent_at) and public.dia_local(c.sent_at) + 21
  ) then
    v_factor := v_factor * 1.38;
  end if;

  -- Poisson aproximat amb una normal
  v_lambda := v_rate * v_factor;
  v_n := greatest(0, round(v_lambda + sqrt(v_lambda) * sqrt(-2 * ln(1 - random())) * cos(2 * pi() * random())))::int;

  for v_at in
    select public.moment_local(p_day, v_hour * 60) + make_interval(secs => floor(random() * 3600)::int)
    from generate_series(1, v_n)
    order by 1
  loop
    if v_at > p_since and v_at <= p_until then
      if public.sim_comanda(v_at) is not null then
        v_count := v_count + 1;
      end if;
    end if;
  end loop;
  return v_count;
end;
$$;

create or replace function public.sim_fins(p_until timestamptz)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_since timestamptz := coalesce((select value::timestamptz from public.sim_config where key = 'ultim_tic'), p_until - interval '2 minutes');
  v_day date;
  v_slot text;
  v_count integer := 0;
begin
  if p_until <= v_since then
    return 0;
  end if;

  for v_day in select generate_series(public.dia_local(v_since), public.dia_local(p_until), interval '1 day')::date loop
    continue when extract(isodow from v_day) = 7;  -- diumenge tancat
    perform public.prepara_produccio(v_day);
    for v_slot in select slot from public.sim_rates where dow = extract(isodow from v_day) order by slot loop
      v_count := v_count + public.sim_franja(v_day, v_slot, v_since, p_until);
    end loop;
  end loop;

  insert into public.sim_config (key, value) values ('ultim_tic', p_until::text)
  on conflict (key) do update set value = excluded.value;
  return v_count;
end;
$$;

/** Tic del restaurant viu: el crida pg_cron cada 2 minuts. Si el Codespace ha estat aturat, posa-ho al dia. */
create or replace function public.posa_al_dia()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  select public.sim_fins(now());
$$;

/** Botó "Simula una comanda" del panell (només l'amo). */
create or replace function public.simula_comanda_ara()
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'Només l''amo pot simular comandes' using errcode = '42501';
  end if;
  return public.sim_comanda(now());
end;
$$;

-- Funcions internes: només per a postgres (seed i cron).
revoke execute on function public.sim_comanda(timestamptz), public.sim_franja(date, text, timestamptz, timestamptz),
  public.sim_fins(timestamptz), public.posa_al_dia(), public.prepara_produccio(date),
  public.sim_tria_plat(timestamptz, text), public.sim_tria_client(timestamptz)
  from public, anon, authenticated;
revoke execute on function public.simula_comanda_ara() from public, anon;
grant execute on function public.simula_comanda_ara() to authenticated;

-- ---------------------------------------------------------------------------
-- Cron: restaurant viu
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

select cron.schedule('restaurant-viu', '*/2 * * * *', $$select public.posa_al_dia()$$);
