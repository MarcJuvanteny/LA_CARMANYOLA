-- Els anuncis del padró que l'amo ha aprovat, per a la web pública (/padro).
-- La taula ingredient_alerts és només de l'amo: aquesta funció n'exposa només el text públic
-- (anunci, tipus, ingredient i dates), dels últims 60 dies.
create or replace function public.padro_anuncis()
returns table (
  id text,
  kind text,
  ingredient text,
  announcement text,
  announcement_es text,
  announcement_en text,
  alta_on date,
  baixa_on date,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.kind, i.name, a.announcement,
    a.i18n -> 'es' ->> 'announcement', a.i18n -> 'en' ->> 'announcement',
    i.alta_on, i.baixa_on, a.resolved_at
  from public.ingredient_alerts a
  join public.ingredients i on i.id = a.ingredient_id
  where a.status = 'aprovada'
    and a.resolved_at > now() - interval '60 days'
    and coalesce(a.announcement, '') <> ''
  order by a.resolved_at desc
  limit 3;
$$;

revoke execute on function public.padro_anuncis() from public;
grant execute on function public.padro_anuncis() to anon, authenticated;
