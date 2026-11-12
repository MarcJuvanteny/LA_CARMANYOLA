-- Fora el segell doble: cada comanda directa suma una paraula, sempre (CONTEXT.md §13).

-- 1. Les campanyes de segell doble (l'esborrany i les enviades simulades). Els destinataris marxen en cascada.
delete from public.campaigns where slug in ('segell-doble', 'segell-doble-dijous', 'segell-doble-dilluns');

-- 2. L'esborrany de recuperació ja no promet "suma doble" (si l'amo l'ha editat o enviat, no es toca).
update public.campaigns set messages = '{"original":{"ca":"Fa dies que no et veiem, {nom}. Et falta recuperar la paraula «{paraula}», i el fricandó amb bolets només està empadronat fins al desembre. La propera carmanyola te la torna.","es":"Hace días que no te vemos, {nom}. Te falta recuperar la palabra «{paraula}», y el fricandó con setas solo está empadronado hasta diciembre. La próxima carmanyola te la devuelve.","en":"We haven''t seen you in a while, {nom}. You still need to win back the word “{paraula}”, and the fricandó with mushrooms is only registered until December. Your next carmanyola brings it back."},"curt":{"ca":"Fa dies que no et veiem, {nom}. Et falta la paraula «{paraula}»: la propera carmanyola te la torna.","es":"Hace días que no te vemos, {nom}. Te falta la palabra «{paraula}»: la próxima carmanyola te la devuelve.","en":"Long time no see, {nom}. You''re missing “{paraula}”: your next carmanyola brings it back."},"calid":{"ca":"{nom}, al barri se''t troba a faltar! Encara tens pendent la paraula «{paraula}» i el fricandó amb bolets t''espera fins al desembre. Vine a buscar-la, que et guardem el lloc.","es":"{nom}, ¡en el barrio se te echa de menos! Aún tienes pendiente la palabra «{paraula}» y el fricandó con setas te espera hasta diciembre. Ven a buscarla, que te guardamos el sitio.","en":"{nom}, the neighbourhood misses you! You''ve still got “{paraula}” to win back, and the fricandó with mushrooms is waiting until December. Come and get it, we''re saving you a spot."},"senseExtra":{"ca":"Fa dies que no et veiem, {nom}. Et falta recuperar la paraula «{paraula}»: la propera carmanyola te la torna.","es":"Hace días que no te vemos, {nom}. Te falta recuperar la palabra «{paraula}»: la próxima carmanyola te la devuelve.","en":"We haven''t seen you in a while, {nom}. You still need to win back the word “{paraula}”: your next carmanyola brings it back."}}'::jsonb
where slug = 'recupera-habituals' and status = 'esborrany' and saved_at is null;

-- 3. Les columnes del segell doble (només les feia servir el simulador).
alter table public.campaigns
  drop column if exists double_days,
  drop column if exists double_from,
  drop column if exists double_to,
  drop column if exists starts_on,
  drop column if exists ends_on;

-- 4. Els textos de la IA sobre les franges es tornen a redactar (ara només descriuen, no proposen).
delete from public.ai_texts where key like 'franges%';

-- 5. Franges: sense la "prova" del segell doble ni l'"extra" de la previsió.
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
    -- i de 15 a 16 h és l'hora del Què Queda.
    where slot not in ('12-13', '15-16', '19-20', '22-23')
    order by mitjana
    limit 4
  ),
  dies as (
    select extract(isodow from o.created_at at time zone 'Europe/Madrid')::int as dow, count(*) / 4.0 as mitjana
    from public.comandes_valides o, params p
    where o.created_at >= public.moment_local(p.monday - 28, 0) and o.created_at < public.moment_local(p.monday, 0)
    group by 1
  )
  select jsonb_build_object(
    'mitjanes', (select jsonb_agg(jsonb_build_object('dow', dow, 'slot', slot, 'n', mitjana) order by dow, slot) from mitjanes),
    'fluixes', (select jsonb_agg(jsonb_build_object('dow', dow, 'slot', slot)) from fluixes),
    'mitjana_fluixes', (select round(avg(m.mitjana), 1) from mitjanes m join fluixes f using (dow, slot)),
    'mitjana_migdia', (select round(avg(mitjana), 1) from mitjanes where slot = '13-14'),
    'previsio', (
      select jsonb_agg(jsonb_build_object('dow', d.dow, 'base', round(d.mitjana)) order by d.dow)
      from dies d where d.dow between 1 and 6
    )
  );
$$;
