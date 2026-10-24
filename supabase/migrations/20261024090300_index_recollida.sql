-- La vista comandes_valides situa cada comanda a l'hora de recollida. Sense aquest índex,
-- les consultes del panell recorren totes les comandes a cada subconsulta.
create index orders_recollida_idx on public.orders ((coalesce(pickup_at, created_at))) where status = 'confirmada';
create index orders_client_recollida_idx on public.orders (customer_id, (coalesce(pickup_at, created_at))) where status = 'confirmada';
create index order_items_plat_idx on public.order_items (dish_id, order_id);
analyze public.orders;
analyze public.order_items;
