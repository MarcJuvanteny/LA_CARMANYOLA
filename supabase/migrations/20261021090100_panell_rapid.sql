-- Les consultes del panell recorren comandes moltes vegades; amb l'RLS avaluat a cada subconsulta
-- triguen ~10x més. Patró: el càlcul viu en un esquema privat i el que es crida des de l'API és
-- un embolcall SECURITY DEFINER que primer comprova que qui crida és l'amo.

create schema if not exists privat;
revoke all on schema privat from public, anon, authenticated;

alter function public.panel_vendes(text) set schema privat;
alter function public.panel_franges() set schema privat;
alter function public.panel_clients() set schema privat;
alter function public.panel_que_queda() set schema privat;
alter function public.panel_campanyes() set schema privat;
alter function public.panel_carnet() set schema privat;

create or replace function public.exigeix_amo()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'Només l''amo pot veure el panell' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.panel_vendes(p_periode text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exigeix_amo();
  return privat.panel_vendes(p_periode);
end;
$$;

create or replace function public.panel_franges()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exigeix_amo();
  return privat.panel_franges();
end;
$$;

create or replace function public.panel_clients()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exigeix_amo();
  return privat.panel_clients();
end;
$$;

create or replace function public.panel_que_queda()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exigeix_amo();
  return privat.panel_que_queda();
end;
$$;

create or replace function public.panel_campanyes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exigeix_amo();
  return privat.panel_campanyes();
end;
$$;

create or replace function public.panel_carnet()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exigeix_amo();
  return privat.panel_carnet();
end;
$$;

revoke execute on function public.panel_vendes(text), public.panel_franges(), public.panel_clients(),
  public.panel_que_queda(), public.panel_campanyes(), public.panel_carnet(), public.exigeix_amo() from public, anon;
grant execute on function public.panel_vendes(text), public.panel_franges(), public.panel_clients(),
  public.panel_que_queda(), public.panel_campanyes(), public.panel_carnet() to authenticated;
