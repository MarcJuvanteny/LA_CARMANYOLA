-- Fora el nivell «Desbowlitzador d'honor»: el carnet té tres nivells
-- (aprenent, desbowlitzador i mestre de la carmanyola).

update public.customers set level = 'mestre' where level = 'honor';
alter table public.customers drop constraint customers_level_check;
alter table public.customers add constraint customers_level_check check (level in ('aprenent', 'desbowlitzador', 'mestre'));

create or replace function public.registra_segell(p_order_id uuid, p_at timestamptz default now())
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_total integer;
  v_word smallint;
  v_complets integer;
  v_level text;
begin
  select id, customer_id, channel, status into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null or v_order.customer_id is null or v_order.channel = 'plataforma' or v_order.status <> 'confirmada' then
    return jsonb_build_object('segell', false);
  end if;
  if exists (select 1 from public.stamps where order_id = p_order_id) then
    return jsonb_build_object('segell', false, 'motiu', 'ja registrat');
  end if;

  perform pg_advisory_xact_lock(hashtext('carnet:' || v_order.customer_id::text));
  select count(*) into v_total from public.stamps where customer_id = v_order.customer_id;
  -- La paraula següent del carnet en curs (1..8)
  v_word := (v_total % 8) + 1;

  insert into public.stamps (customer_id, order_id, word_id, created_at) values (v_order.customer_id, p_order_id, v_word, p_at);
  update public.orders set qr_used_at = p_at where id = p_order_id;
  v_total := v_total + 1;
  v_complets := v_total / 8;

  if v_total % 8 = 0 then
    insert into public.rewards (customer_id, kind, created_at) values (v_order.customer_id, 'postre', p_at);
    if v_complets = 3 then
      insert into public.rewards (customer_id, kind, created_at) values (v_order.customer_id, 'carmanyola-reutilitzable', p_at);
    end if;
  end if;

  v_level := case when v_complets >= 3 then 'mestre' when v_complets >= 1 then 'desbowlitzador' else 'aprenent' end;
  update public.customers set level = v_level where id = v_order.customer_id and level is distinct from v_level;

  return jsonb_build_object('segell', true, 'paraula', v_word, 'segells', v_total, 'nivell', v_level);
end;
$$;

create or replace function public.recalcula_nivells()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  with n as (
    select c.id,
      case when coalesce(s.total, 0) / 8 >= 3 then 'mestre' when coalesce(s.total, 0) / 8 >= 1 then 'desbowlitzador' else 'aprenent' end as level
    from public.customers c
    left join (select customer_id, count(*) as total from public.stamps group by customer_id) s on s.customer_id = c.id
  ),
  u as (
    update public.customers c set level = n.level from n where n.id = c.id and c.level is distinct from n.level returning 1
  )
  select count(*)::int from u;
$$;
