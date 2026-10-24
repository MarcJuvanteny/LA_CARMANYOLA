-- Restaurant viu: pg_cron + pg_net criden les rutes /api/sim de l'app.
-- El secret (Bearer) i la URL base es llegeixen del Vault: aquí no hi ha cap clau.
--   select vault.create_secret('<SIM_SECRET>', 'sim_secret');
--   select vault.create_secret('https://<app>.vercel.app', 'sim_app_url');
-- En local, scripts/base-seed.ts els crea sol.

create extension if not exists pg_net;

-- Una vegada per nit (la ruta decideix si és l'hora a Barcelona)
create table public.sim_nights (
  day date primary key,
  created_at timestamptz not null default now()
);
alter table public.sim_nights enable row level security;

create or replace function public.sim_crida(p_ruta text)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'sim_app_url');
  v_secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'sim_secret');
begin
  if v_url is null or v_secret is null then
    raise notice 'Falten els secrets sim_app_url o sim_secret al Vault';
    return null;
  end if;
  return net.http_post(
    url := rtrim(v_url, '/') || p_ruta,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
end;
$$;

revoke execute on function public.sim_crida(text) from public, anon, authenticated;

-- tick cada 10 minuts; que-queda i nightly cada 30 (la ruta mira l'hora a Europe/Madrid,
-- així el canvi d'horari d'estiu no ens afecta)
select cron.schedule('sim-tick', '*/10 * * * *', $$select public.sim_crida('/api/sim/tick')$$);
select cron.schedule('sim-que-queda', '*/30 * * * *', $$select public.sim_crida('/api/sim/que-queda')$$);
select cron.schedule('sim-nightly', '15,45 * * * *', $$select public.sim_crida('/api/sim/nightly')$$);
