-- Memòria de la IA: el darrer text redactat per a cada targeta del panell.
-- `input_hash` resumeix les dades d'entrada; si les dades canvien, el text es torna a redactar.
-- Només hi accedeix el servidor amb la service role (cap política per a anon/authenticated).

create table if not exists public.ai_texts (
  key text primary key,
  input_hash text not null,
  content jsonb not null,
  model text,
  created_at timestamptz not null default now()
);

alter table public.ai_texts enable row level security;
