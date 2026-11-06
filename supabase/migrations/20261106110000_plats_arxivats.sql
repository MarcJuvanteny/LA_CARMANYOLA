-- Carta editable des del panell: un plat que l'amo treu de la carta s'arxiva, no s'esborra.
-- Així les comandes i les vendes antigues el continuen trobant.
alter table public.dishes add column if not exists archived boolean not null default false;
