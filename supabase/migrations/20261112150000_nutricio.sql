-- Informació nutricional per ració (segon nivell a la fitxa del plat). L'omple l'amo des del panell;
-- si és null, la web no en mostra res. Valors en l'ordre del Reglament (UE) 1169/2011.
alter table public.dishes add column if not exists nutrition jsonb;

-- Totes les claus hi han de ser (?&: mai null) i cada valor ha de ser un número no negatiu.
alter table public.dishes drop constraint if exists dishes_nutrition_valida;
alter table public.dishes add constraint dishes_nutrition_valida check (
  nutrition is null or (
    jsonb_typeof(nutrition) = 'object'
    and nutrition ?& array['grams', 'kcal', 'greixos', 'saturats', 'hidrats', 'sucres', 'proteines', 'sal']
    and jsonb_typeof(nutrition -> 'grams') = 'number' and (nutrition -> 'grams') >= '0'::jsonb
    and jsonb_typeof(nutrition -> 'kcal') = 'number' and (nutrition -> 'kcal') >= '0'::jsonb
    and jsonb_typeof(nutrition -> 'greixos') = 'number' and (nutrition -> 'greixos') >= '0'::jsonb
    and jsonb_typeof(nutrition -> 'saturats') = 'number' and (nutrition -> 'saturats') >= '0'::jsonb
    and jsonb_typeof(nutrition -> 'hidrats') = 'number' and (nutrition -> 'hidrats') >= '0'::jsonb
    and jsonb_typeof(nutrition -> 'sucres') = 'number' and (nutrition -> 'sucres') >= '0'::jsonb
    and jsonb_typeof(nutrition -> 'proteines') = 'number' and (nutrition -> 'proteines') >= '0'::jsonb
    and jsonb_typeof(nutrition -> 'sal') = 'number' and (nutrition -> 'sal') >= '0'::jsonb
  )
);
