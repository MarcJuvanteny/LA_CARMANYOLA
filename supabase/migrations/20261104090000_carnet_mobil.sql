-- El carnet va lligat al mòbil: és el que es demana en fer la comanda per sumar-hi la paraula.
-- El correu queda opcional, només per als avisos.
alter table public.customers add column if not exists phone text;

create unique index if not exists customers_phone_real on public.customers (phone) where not simulated and phone is not null;
