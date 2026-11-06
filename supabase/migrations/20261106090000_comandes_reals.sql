-- Comandes reals: Stripe, faixa amb QR, wallet que s'actualitza, correus i baixa amb un clic.
-- Res d'això toca les dades simulades: tot el que és nou només ho fan servir els clients reals.

-- ---------------------------------------------------------------------------
-- Comandes: pendent de pagament → confirmada
-- ---------------------------------------------------------------------------

alter table public.orders drop constraint orders_status_check;
alter table public.orders
  add constraint orders_status_check check (status in ('pendent', 'confirmada', 'cancel·lada'));

alter table public.orders
  add column if not exists customer_name text,          -- el nom per cridar la comanda
  add column if not exists phone text,                  -- el mòbil del carnet, si l'ha escrit
  add column if not exists locale text not null default 'ca' check (locale in ('ca', 'es', 'en')),
  add column if not exists cart jsonb,                  -- les línies tal com les ha vist el client
  add column if not exists number integer,              -- el número que diu la cuina
  add column if not exists paid_at timestamptz;

create sequence if not exists public.orders_number_seq start 427;

create index if not exists orders_pendents_idx on public.orders (created_at) where status = 'pendent';

alter table public.order_items add column if not exists detail text;  -- el que porta un Fes-te'l tu

/** Confirma una comanda pendent (webhook de Stripe o pagament de prova). Idempotent. */
create or replace function public.confirma_comanda(p_order_id uuid, p_qr text, p_session text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v record;
begin
  update public.orders
     set status = 'confirmada',
         paid_at = now(),
         number = nextval('public.orders_number_seq'),
         qr_code = coalesce(qr_code, p_qr),
         stripe_session_id = coalesce(p_session, stripe_session_id)
   where id = p_order_id and status = 'pendent'
  returning id, number into v;

  if v.id is null then
    return jsonb_build_object('confirmada', false);
  end if;
  return jsonb_build_object('confirmada', true, 'numero', v.number);
end;
$$;

-- ---------------------------------------------------------------------------
-- Límit de peticions (/c/[codi], alta al carnet): finestres fixes a la base de dades,
-- perquè a Vercel cada petició pot anar a una instància diferent.
-- ---------------------------------------------------------------------------

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create or replace function public.limita(p_clau text, p_max integer, p_segons integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_inici timestamptz := to_timestamp(floor(extract(epoch from now()) / p_segons) * p_segons);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_clau, v_inici, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  -- Neteja de tant en tant les finestres velles.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------------------
-- Wallet: dispositius d'Apple registrats i l'últim avís que mostra la targeta
-- ---------------------------------------------------------------------------

create table if not exists public.wallet_devices (
  device_id text not null,
  customer_id uuid not null references public.customers (id) on delete cascade,
  push_token text not null,
  created_at timestamptz not null default now(),
  primary key (device_id, customer_id)
);

alter table public.customers
  add column if not exists wallet_updated_at timestamptz not null default now(),
  add column if not exists wallet_message text;

/** Cada segell nou fa que la targeta del wallet canviï. */
create or replace function public.toca_wallet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.customers set wallet_updated_at = now() where id = new.customer_id and not simulated;
  return new;
end;
$$;

drop trigger if exists stamps_toca_wallet on public.stamps;
create trigger stamps_toca_wallet after insert on public.stamps
  for each row execute function public.toca_wallet();

-- ---------------------------------------------------------------------------
-- Enviaments reals
-- ---------------------------------------------------------------------------

alter table public.campaign_recipients
  add column if not exists channels text[] not null default '{}',  -- per on ha sortit: correu, wallet
  add column if not exists error text;

alter table public.que_queda_alerts
  add column if not exists sent_at timestamptz,
  add column if not exists recipients integer;

alter table public.customers add column if not exists unsubscribed_at timestamptz;

-- ---------------------------------------------------------------------------
-- RLS i permisos
-- ---------------------------------------------------------------------------

alter table public.rate_limits enable row level security;
alter table public.wallet_devices enable row level security;
create policy "amo: tot" on public.wallet_devices for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
-- rate_limits: sense cap política, només la service role.

revoke execute on function public.confirma_comanda(uuid, text, text), public.limita(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.confirma_comanda(uuid, text, text), public.limita(text, integer, integer)
  to service_role;
grant usage on sequence public.orders_number_seq to service_role;
