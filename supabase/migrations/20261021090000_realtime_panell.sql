-- Qualsevol canvi a les dades que alimenten el panell (també fet a mà des de l'Studio)
-- arriba al navegador i torna a calcular els gràfics.
alter publication supabase_realtime add table
  public.order_items, public.customers, public.stamps, public.dishes, public.ingredients,
  public.ingredient_alerts, public.campaign_recipients, public.campaign_requests,
  public.que_queda_alerts, public.production_plans, public.brand_voice;
