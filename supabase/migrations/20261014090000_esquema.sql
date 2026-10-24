-- La Carmanyola · esquema base (CONTEXT.md §8)
-- Preus en cèntims. Tot el que és simulat porta `simulated = true`.

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Amo del panell
-- ---------------------------------------------------------------------------

create table public.owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.owners o where o.user_id = (select auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- Carta
-- ---------------------------------------------------------------------------

create table public.dishes (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,                       -- sempre en català
  section text not null check (section in ('casa', 'fes', 'acompanyar', 'postres', 'begudes')),
  price_cents integer not null check (price_cents >= 0),
  description jsonb not null default '{"ca": "", "es": "", "en": ""}',
  allergens text[] not null default '{}',
  season text not null default 'tot l''any' check (season in ('tot l''any', 'tardor', 'hivern', 'primavera', 'estiu')),
  tags text[] not null default '{}',
  supplement jsonb,                         -- {"name": "...", "price_cents": 200}
  que_queda_ok boolean not null default false,
  available boolean not null default true,
  sort smallint not null default 0,
  updated_at timestamptz not null default now()
);

create table public.ingredients (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  comarca text,
  supplier text,                            -- pendent de confirmar
  season text not null check (season in ('tardor', 'hivern', 'primavera', 'estiu')),
  status text not null check (status in ('empadronat', 'alta-proposada', 'baixa-proposada', 've-aviat', 'de-baixa')),
  alta_on date,
  baixa_on date,
  alta_label text,                          -- quan només sabem el mes ("gener")
  baixa_label text,
  bedca_ref text
);

create table public.dish_ingredients (
  dish_id smallint not null references public.dishes (id) on delete cascade,
  ingredient_id smallint not null references public.ingredients (id) on delete cascade,
  primary key (dish_id, ingredient_id)
);

create table public.build_options (
  id smallint generated always as identity primary key,
  kind text not null check (kind in ('plat', 'guarnicio', 'acompanyament', 'salsa')),
  name text not null,
  supplement_cents integer not null default 0,
  available boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Clients i comandes
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  gender text not null default 'x' check (gender in ('f', 'm', 'x')),  -- només per a la forma del nivell
  email text,
  locale text not null default 'ca' check (locale in ('ca', 'es', 'en')),
  consent_email boolean not null default false,
  consent_at timestamptz,
  wallet_apple_id text,
  wallet_google_id text,
  profile text,                             -- perfil del seed (oficinista, ocasional…)
  simulated boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  channel text not null check (channel in ('web', 'local', 'plataforma')),
  created_at timestamptz not null default now(),
  pickup_at timestamptz,
  total_cents integer not null default 0,
  dinar boolean not null default false,     -- El Dinar: +2 €
  qr_code text unique,                      -- faixa: un sol ús
  qr_used_at timestamptz,
  stripe_session_id text unique,
  simulated boolean not null default false
);

create index orders_created_at_idx on public.orders (created_at);
create index orders_customer_idx on public.orders (customer_id, created_at);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  dish_id smallint not null references public.dishes (id),
  qty smallint not null default 1 check (qty > 0),
  unit_price_cents integer not null
);

create index order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Carnet
-- ---------------------------------------------------------------------------

create table public.words (
  id smallint primary key check (id between 1 and 8),
  from_word text,                           -- l'anglicisme (bowl); null: paraula pendent de decidir
  to_word text                              -- la paraula recuperada (carmanyola)
);

create table public.stamps (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.customers (id) on delete cascade,
  order_id uuid unique references public.orders (id) on delete cascade,  -- màxim un segell per comanda; null = segell de regal
  word_id smallint not null references public.words (id),
  created_at timestamptz not null default now()
);

create index stamps_customer_idx on public.stamps (customer_id, created_at);

create table public.rewards (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.customers (id) on delete cascade,
  kind text not null check (kind in ('segell-regal', 'postre', 'carmanyola-reutilitzable')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Màrqueting
-- ---------------------------------------------------------------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind text not null check (kind in ('recuperacio', 'franja', 'padro', 'calendari')),
  segment text,                             -- clau del segment que calcula SQL
  title text not null,
  chips text[] not null default '{}',
  reasons text[] not null default '{}',     -- el "per què" de la IA
  ai_reasoning text,
  messages jsonb not null,                  -- {to: {ca, es, en}}
  simpler_label text,
  channel_wallet boolean not null default true,
  channel_email boolean not null default false,
  schedule_text text,
  schedule_reason text,
  preview_date text,
  preview_time text,
  status text not null default 'esborrany' check (status in ('esborrany', 'aprovada', 'enviada', 'descartada', 'ara-no')),
  saved_at timestamptz,
  sent_at timestamptz,
  proposed_label text,
  created_at timestamptz not null default now()
);

create table public.campaign_recipients (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  control boolean not null default false,   -- grup de control: no rep l'avís
  sent_at timestamptz,
  return_order_id uuid references public.orders (id) on delete set null,
  primary key (campaign_id, customer_id)
);

create table public.campaign_requests (
  id bigint generated always as identity primary key,
  goal text not null check (char_length(goal) between 3 and 500),
  created_at timestamptz not null default now()
);

-- Producció del dia i Què Queda
create table public.leftovers (
  day date not null,
  service text not null check (service in ('migdia', 'vespre')),
  dish_id smallint not null references public.dishes (id),
  made smallint not null check (made >= 0),
  forecast_override smallint,
  included boolean,
  primary key (day, service, dish_id)
);

create table public.que_queda_alerts (
  day date not null,
  service text not null check (service in ('migdia', 'vespre')),
  message text not null,
  activated_at timestamptz not null default now(),
  primary key (day, service)
);

create table public.production_plans (
  day date not null,
  dish_id smallint not null references public.dishes (id),
  planned smallint not null,
  status text not null default 'proposat' check (status in ('proposat', 'enviat', 'xef')),
  primary key (day, dish_id)
);

create table public.ingredient_alerts (
  id text primary key,
  ingredient_id smallint not null references public.ingredients (id) on delete cascade,
  kind text not null check (kind in ('alta', 'baixa')),
  title text not null,
  reasons text[] not null default '{}',
  announcement text not null,
  campaign_slug text,
  status text not null default 'proposada' check (status in ('proposada', 'aprovada', 'ara-no')),
  resolved_at timestamptz
);

create table public.brand_voice (
  id text primary key,
  title text not null,
  body text not null,
  sort smallint not null default 0,
  updated_at timestamptz not null default now()
);

-- Temps diari (Open-Meteo) i festius
create table public.weather_daily (
  day date primary key,
  rain_mm numeric(5, 1) not null default 0,
  temp_max numeric(4, 1),
  source text not null default 'open-meteo'
);

create table public.holidays (
  day date primary key,
  name text not null
);

-- ---------------------------------------------------------------------------
-- RLS: només l'amo veu i toca el panell. La web pública llegirà la carta.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'owners', 'dishes', 'ingredients', 'dish_ingredients', 'build_options', 'customers', 'orders',
    'order_items', 'words', 'stamps', 'rewards', 'campaigns', 'campaign_recipients', 'campaign_requests',
    'leftovers', 'que_queda_alerts', 'production_plans', 'ingredient_alerts', 'brand_voice',
    'weather_daily', 'holidays'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "amo: tot" on public.%I for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()))',
      t
    );
  end loop;
end $$;

-- La carta i el padró són públics (només lectura).
create policy "public: llegir carta" on public.dishes for select to anon, authenticated using (true);
create policy "public: llegir padró" on public.ingredients for select to anon, authenticated using (true);
create policy "public: llegir paraules" on public.words for select to anon, authenticated using (true);

-- Realtime: el panell escolta les comandes noves i els canvis de producció.
alter publication supabase_realtime add table public.orders, public.leftovers, public.campaigns;
