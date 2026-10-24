-- Franges fluixes: comparar només hores senceres de servei.

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
    -- Només hores senceres: les mitges hores de les vores (12:30, 19:30, 22:00) sempre semblen fluixes,
    -- i de 15 a 16 h és l'hora del Què Queda (no es toca).
    where slot not in ('12-13', '15-16', '19-20', '22-23')
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

