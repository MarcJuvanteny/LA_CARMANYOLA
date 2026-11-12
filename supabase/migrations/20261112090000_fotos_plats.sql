-- Fotos dels plats pujades des del panell. Lectura pública (la web les mostra); només l'amo en puja o n'esborra.
alter table public.dishes add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plats', 'plats', true, 3145728, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "plats: l'amo puja" on storage.objects;
create policy "plats: l'amo puja" on storage.objects for insert to authenticated
  with check (bucket_id = 'plats' and (select public.is_owner()));

drop policy if exists "plats: l'amo canvia" on storage.objects;
create policy "plats: l'amo canvia" on storage.objects for update to authenticated
  using (bucket_id = 'plats' and (select public.is_owner()));

drop policy if exists "plats: l'amo esborra" on storage.objects;
create policy "plats: l'amo esborra" on storage.objects for delete to authenticated
  using (bucket_id = 'plats' and (select public.is_owner()));
