-- Diccionari del carnet complet: les paraules 5 a 8 (abans pendents de decidir, a null).
-- Idempotent: només omple les files que encara no tenen paraula.
insert into public.words (id, from_word, to_word) values
  (5, 'lunch', 'dinar'),
  (6, 'snack', 'berenar'),
  (7, 'veggie', 'de l''hort'),
  (8, 'foodie', 'bona forquilla')
on conflict (id) do update
  set from_word = coalesce(public.words.from_word, excluded.from_word),
      to_word = coalesce(public.words.to_word, excluded.to_word);
