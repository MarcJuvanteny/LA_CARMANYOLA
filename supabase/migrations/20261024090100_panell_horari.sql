-- Panell adaptat a l'horari del simulador (dinar 12:30-16:00, sopar 19:30-22:30)
-- i a les comandes vàlides (sense cancel·lades, situades a l'hora de recollida).
-- Mateix cos que 20261014090200_panell.sql, ara a l'esquema privat (vegeu 20261021090100).

create or replace function privat.panel_vendes(p_periode text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_today date := public.dia_local(v_now);
  v_monday date := v_today - (extract(isodow from v_today)::int - 1);
  v_cur_from timestamptz;
  v_cur_to timestamptz;
  v_prev_from timestamptz;
  v_prev_to timestamptz;
  v_from_day date;
  v_result jsonb;
begin
  if p_periode = 'avui' then
    v_cur_from := public.moment_local(v_today, 0);
    v_cur_to := v_now;
    v_prev_from := v_cur_from - interval '7 days';
    v_prev_to := v_now - interval '7 days';
  elsif p_periode = 'setmana' then
    v_cur_from := public.moment_local(v_monday - 7, 0);
    v_cur_to := public.moment_local(v_monday, 0);
    v_prev_from := public.moment_local(v_monday - 14, 0);
    v_prev_to := v_cur_from;
  elsif p_periode = 'mes' then
    v_cur_from := public.moment_local(v_monday - 28, 0);
    v_cur_to := public.moment_local(v_monday, 0);
    v_prev_from := public.moment_local(v_monday - 56, 0);
    v_prev_to := v_cur_from;
  else
    raise exception 'Període desconegut: %', p_periode;
  end if;
  v_from_day := public.dia_local(v_cur_from);

  with o as (
    select o.*,
      case
        when o.created_at >= v_cur_from and o.created_at < v_cur_to then 'c'
        when o.created_at >= v_prev_from and o.created_at < v_prev_to then 'p'
      end as per,
      case p_periode
        when 'avui' then public.franja_de(o.created_at)
        when 'setmana' then extract(isodow from o.created_at at time zone 'Europe/Madrid')::text
        else floor((public.dia_local(o.created_at) - case when o.created_at >= v_cur_from then v_from_day else v_from_day - 28 end) / 7.0)::text
      end as bucket
    from public.comandes_valides o
    where o.created_at >= v_prev_from and o.created_at < v_cur_to
  ),
  tot as (
    select per,
      coalesce(sum(total_cents), 0) as ingressos,
      count(*) as comandes,
      count(*) filter (where dinar) as dinar,
      coalesce(sum(total_cents) filter (where channel <> 'plataforma'), 0) as directe,
      coalesce(sum(total_cents) filter (where channel = 'plataforma'), 0) as plataformes
    from o where per is not null group by per
  ),
  buckets as (
    select k.k,
      coalesce(sum(o.total_cents) filter (where o.per = 'c'), 0) as actual,
      coalesce(sum(o.total_cents) filter (where o.per = 'p'), 0) as anterior
    from unnest(case p_periode
        when 'avui' then array['12-13', '13-14', '14-15', '15-16', '19-20', '20-21', '21-22', '22-23']
        when 'setmana' then array['1', '2', '3', '4', '5', '6']
        else array['0', '1', '2', '3'] end) with ordinality as k (k, ord)
    left join o on o.bucket = k.k
    group by k.k, k.ord
    order by k.ord
  ),
  plats as (
    select d.name, d.sort,
      coalesce(sum(oi.qty) filter (where o.per = 'c'), 0) as unitats,
      coalesce(sum(oi.qty * oi.unit_price_cents) filter (where o.per = 'c'), 0) as ingressos,
      coalesce(sum(oi.qty * oi.unit_price_cents) filter (where o.per = 'p'), 0) as anteriors
    from public.dishes d
    left join public.order_items oi on oi.dish_id = d.id
    left join o on o.id = oi.order_id and o.per is not null
    where d.section in ('casa', 'fes')
    group by d.id, d.name, d.sort
  ),
  altres as (
    select coalesce(sum(oi.qty * oi.unit_price_cents), 0) as import
    from public.order_items oi
    join o on o.id = oi.order_id and o.per = 'c'
    join public.dishes d on d.id = oi.dish_id and d.section in ('acompanyar', 'postres', 'begudes')
  )
  select jsonb_build_object(
    'des_de', v_cur_from,
    'fins_a', v_cur_to,
    'actual', (select to_jsonb(t) from tot t where per = 'c'),
    'anterior', (select to_jsonb(t) from tot t where per = 'p'),
    'buckets', (select jsonb_agg(jsonb_build_object('k', k, 'actual', actual, 'anterior', anterior)) from buckets),
    'plats', (select jsonb_agg(jsonb_build_object('nom', name, 'unitats', unitats, 'ingressos', ingressos, 'anteriors', anteriors) order by ingressos desc, sort) from plats),
    'altres', (select import from altres)
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Franges: mitjana de les últimes 8 setmanes completes
-- ---------------------------------------------------------------------------

create or replace function privat.panel_franges()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with params as (
    select public.dia_local(now()) - (extract(isodow from public.dia_local(now()))::int - 1) as monday
  ),
  slots as (
    select d.dow, s.slot from generate_series(1, 6) as d (dow) cross join unnest(array['12-13', '13-14', '14-15', '15-16', '19-20', '20-21', '21-22', '22-23']) as s (slot)
  ),
  mitjanes as (
    select s.dow, s.slot,
      round(count(o.id) / 8.0, 1) as mitjana
    from slots s
    cross join params p
    left join public.comandes_valides o
      on o.created_at >= public.moment_local(p.monday - 56, 0)
     and o.created_at < public.moment_local(p.monday, 0)
     and extract(isodow from o.created_at at time zone 'Europe/Madrid') = s.dow
     and public.franja_de(o.created_at) = s.slot
    group by s.dow, s.slot
  ),
  fluixes as (
    select dow, slot from mitjanes
    where slot <> '15-16'  -- l'hora del Què Queda: no es toca
    order by mitjana
    limit 4
  ),
  dies as (
    select extract(isodow from o.created_at at time zone 'Europe/Madrid')::int as dow, count(*) / 4.0 as mitjana
    from public.comandes_valides o, params p
    where o.created_at >= public.moment_local(p.monday - 28, 0) and o.created_at < public.moment_local(p.monday, 0)
    group by 1
  ),
  prova as (
    -- La prova del segell doble: dilluns al vespre durant la campanya vs les 3 setmanes anteriors
    select c.sent_at,
      (select count(*) from public.comandes_valides o
        where extract(isodow from o.created_at at time zone 'Europe/Madrid') = 1 and public.franja_de(o.created_at) in ('19-20', '20-21', '21-22', '22-23')
          and public.dia_local(o.created_at) between public.dia_local(c.sent_at) and public.dia_local(c.sent_at) + 21) as durant,
      (select count(*) from public.comandes_valides o
        where extract(isodow from o.created_at at time zone 'Europe/Madrid') = 1 and public.franja_de(o.created_at) in ('19-20', '20-21', '21-22', '22-23')
          and public.dia_local(o.created_at) between public.dia_local(c.sent_at) - 22 and public.dia_local(c.sent_at) - 1) as abans
    from public.campaigns c
    where c.kind = 'franja' and c.status = 'enviada'
    order by c.sent_at desc
    limit 1
  )
  select jsonb_build_object(
    'mitjanes', (select jsonb_agg(jsonb_build_object('dow', dow, 'slot', slot, 'n', mitjana) order by dow, slot) from mitjanes),
    'fluixes', (select jsonb_agg(jsonb_build_object('dow', dow, 'slot', slot)) from fluixes),
    'mitjana_fluixes', (select round(avg(m.mitjana), 1) from mitjanes m join fluixes f using (dow, slot)),
    'mitjana_migdia', (select round(avg(mitjana), 1) from mitjanes where slot = '13-14'),
    'previsio', (
      select jsonb_agg(jsonb_build_object(
        'dow', d.dow,
        'base', round(d.mitjana),
        'extra', coalesce((select round(sum(m.mitjana) * 0.38) from mitjanes m join fluixes f using (dow, slot) where m.dow = d.dow), 0)
      ) order by d.dow)
      from dies d where d.dow between 1 and 6
    ),
    'prova', (select jsonb_build_object('enviada', sent_at, 'durant', durant, 'abans', abans) from prova)
  );
$$;

-- ---------------------------------------------------------------------------
-- Clients: freqüència, risc i carnet
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
    -- paraules del carnet en curs
    select s.customer_id, array_agg(s.word_id) as paraules
    from (
      select customer_id, word_id,
        row_number() over (partition by customer_id order by created_at, id) as rn,
        count(*) over (partition by customer_id) as total
      from public.stamps
    ) s
    where s.rn > s.total - (s.total % 8)
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
    select c.id, c.first_name, c.last_name, c.gender, c.created_at,
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
      (b.complets >= 3) as mestre,
      (b.sense_venir > 45) as adormit
    from base b
  )
  select jsonb_build_object(
    'total_comandes_90', (select count(*) from public.comandes_valides where created_at > now() - interval '90 days'),
    'clients', (select jsonb_agg(to_jsonb(a) order by a.risc desc, a.first_name) from amb_risc a)
  );
$$;

-- ---------------------------------------------------------------------------
-- Què Queda i producció de demà
-- ---------------------------------------------------------------------------

create or replace function privat.panel_que_queda()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_today date := public.dia_local(v_now);
  v_minut integer := extract(hour from v_now at time zone 'Europe/Madrid')::int * 60 + extract(minute from v_now at time zone 'Europe/Madrid')::int;
  v_servei text := case when v_minut < 17 * 60 then 'migdia' else 'vespre' end;
  v_qq integer := case when v_servei = 'migdia' then 15 * 60 + 30 else 22 * 60 end;
  v_inici integer := case when v_servei = 'migdia' then 12 * 60 + 30 else 19 * 60 + 30 end;
  v_dema date := v_today + case when extract(isodow from v_today) = 6 then 2 else 1 end;
  v_result jsonb;
begin
  with plats as (
    select d.id, d.name, d.sort, l.made, l.forecast_override, l.included,
      (select coalesce(sum(oi.qty), 0) from public.order_items oi join public.comandes_valides o on o.id = oi.order_id
        where oi.dish_id = d.id and o.created_at >= public.moment_local(v_today, v_inici) and o.created_at < v_now) as venuts,
      -- el que se sol vendre des d'ara fins a l'hora del Què Queda (4 mateixos dies anteriors)
      (select coalesce(sum(oi.qty), 0) / 4.0 from public.order_items oi join public.comandes_valides o on o.id = oi.order_id
        cross join generate_series(1, 4) k
        where oi.dish_id = d.id
          and o.created_at >= public.moment_local(v_today - 7 * k, greatest(v_minut, v_inici))
          and o.created_at < public.moment_local(v_today - 7 * k, v_qq)) as encara
    from public.dishes d
    join public.leftovers l on l.dish_id = d.id and l.day = v_today and l.service = v_servei
    where d.section = 'casa' and d.que_queda_ok
  ),
  encert as (
    select sum(despres)::numeric / nullif(sum(greatest(quedava, 0)), 0) as pct
    from (
      select l.day, l.dish_id,
        l.made - (select coalesce(sum(oi.qty), 0) from public.order_items oi join public.comandes_valides o on o.id = oi.order_id
          where oi.dish_id = l.dish_id and o.created_at >= public.moment_local(l.day, 12 * 60) and o.created_at < public.moment_local(l.day, 15 * 60 + 30)) as quedava,
        (select coalesce(sum(oi.qty), 0) from public.order_items oi join public.comandes_valides o on o.id = oi.order_id
          where oi.dish_id = l.dish_id and o.created_at >= public.moment_local(l.day, 15 * 60 + 30) and o.created_at < public.moment_local(l.day, 16 * 60)) as despres
      from public.leftovers l
      where l.service = 'migdia' and l.day between v_today - 28 and v_today - 1
    ) x
  ),
  dema as (
    select d.id, d.name,
      coalesce((select made from public.leftovers where day = v_today and service = 'migdia' and dish_id = d.id), 0) as abans,
      (select round(avg(t.n) * 1.12) + 1 from (
        select coalesce(sum(oi.qty), 0) as n
        from generate_series(1, 4) k
        left join public.comandes_valides o on o.created_at >= public.moment_local(v_dema - 7 * k, 12 * 60) and o.created_at < public.moment_local(v_dema - 7 * k, 16 * 60)
        left join public.order_items oi on oi.order_id = o.id and oi.dish_id = d.id
        group by k) t) as proposat,
      (select count(*) from public.leftovers l
        where l.dish_id = d.id and l.service = 'migdia' and l.day in (select v_dema - 7 * k from generate_series(1, 6) k)
          and l.made - (select coalesce(sum(oi.qty), 0) from public.order_items oi join public.comandes_valides o on o.id = oi.order_id
            where oi.dish_id = l.dish_id and o.created_at >= public.moment_local(l.day, 12 * 60) and o.created_at < public.moment_local(l.day, 16 * 60)) >= 3) as sobra,
      (select count(*) from public.leftovers l
        where l.dish_id = d.id and l.service = 'migdia' and l.day in (select v_dema - 7 * k from generate_series(1, 6) k)
          and l.made <= (select coalesce(sum(oi.qty), 0) from public.order_items oi join public.comandes_valides o on o.id = oi.order_id
            where oi.dish_id = l.dish_id and o.created_at >= public.moment_local(l.day, 12 * 60) and o.created_at < public.moment_local(l.day, 16 * 60))) as esgota,
      (select pp.status from public.production_plans pp where pp.day = v_dema and pp.dish_id = d.id) as estat
    from public.dishes d
    where d.section = 'casa'
  )
  select jsonb_build_object(
    'servei', v_servei,
    'ara', v_now,
    'hora_qq', lpad((v_qq / 60)::text, 2, '0') || ':' || lpad((v_qq % 60)::text, 2, '0'),
    'temps', (select jsonb_build_object('pluja', rain_mm, 'max', temp_max) from public.weather_daily where day = v_today),
    'avis', (select jsonb_build_object('missatge', message, 'activat', activated_at) from public.que_queda_alerts where day = v_today and service = v_servei),
    'plats', (select jsonb_agg(jsonb_build_object(
        'id', id, 'nom', name, 'fets', made, 'venuts', venuts,
        'previsio', coalesce(forecast_override, greatest(0, made - venuts - round(encara)))::int,
        'inclos', included
      ) order by greatest(0, made - venuts - round(encara)) desc, sort) from plats),
    'encert', (select round(least(1, pct), 2) from encert),
    'dema', v_dema,
    'temps_dema', (select jsonb_build_object('pluja', rain_mm, 'max', temp_max) from public.weather_daily where day = v_dema),
    'produccio', (select jsonb_agg(to_jsonb(x) order by abs(x.proposat - x.abans) desc) from (select * from dema where proposat is not null order by abs(proposat - abans) desc limit 3) x)
  ) into v_result;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Campanyes: resultats amb grup de control (atribució a 14 dies)
-- ---------------------------------------------------------------------------

create or replace function privat.panel_campanyes()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_agg(
    to_jsonb(c) || jsonb_build_object(
      'resultat', case when c.sent_at is null then null else (
        select jsonb_build_object(
          'clients', count(*) filter (where not r.control),
          'control_n', count(*) filter (where r.control),
          'tornat', round(avg(case when exists (
              select 1 from public.comandes_valides o where o.customer_id = r.customer_id
                and o.created_at > c.sent_at and o.created_at <= c.sent_at + interval '14 days'
            ) then 1 else 0 end) filter (where not r.control), 3),
          'control', round(avg(case when exists (
              select 1 from public.comandes_valides o where o.customer_id = r.customer_id
                and o.created_at > c.sent_at and o.created_at <= c.sent_at + interval '14 days'
            ) then 1 else 0 end) filter (where r.control), 3)
        )
        from public.campaign_recipients r where r.campaign_id = c.id
      ) end
    )
    order by c.sent_at desc nulls first, c.created_at
  )
  from public.campaigns c;
$$;

-- ---------------------------------------------------------------------------
-- Resum: carnet de la setmana
-- ---------------------------------------------------------------------------

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
    'aprenents', (select count(*) from public.customers c left join st on st.customer_id = c.id where coalesce(st.total, 0) < 8),
    'desbowlitzadors', (select count(*) from st where total >= 8 and total < 24),
    'mestres', (select count(*) from st where total >= 24),
    'paraules_setmana', (select coalesce(sum(setmana), 0) from st),
    'complets_setmana', (select count(*) from st where setmana > 0 and total / 8 > (total - setmana) / 8),
    'directes', (select round(avg(case when channel <> 'plataforma' then 1 else 0 end), 2) from public.comandes_valides where created_at > now() - interval '7 days')
  );
$$;

