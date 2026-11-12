-- Campanyes a la seva hora: en aprovar-la, si l'hora d'enviament encara no ha arribat, queda programada
-- i la ruta /api/enviaments (pg_cron cada 10 minuts) l'envia quan toca.
alter table public.campaigns add column if not exists scheduled_at timestamptz;

create index if not exists campaigns_programades_idx on public.campaigns (scheduled_at)
  where status = 'aprovada' and sent_at is null;

select cron.unschedule('enviaments') where exists (select 1 from cron.job where jobname = 'enviaments');
select cron.schedule('enviaments', '*/10 * * * *', $$select public.sim_crida('/api/enviaments')$$);
