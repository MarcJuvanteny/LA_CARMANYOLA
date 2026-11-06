import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { plats as cartaLocal, type Idioma, type Plat } from "@/lib/data/carta";

/* Lectures de la web pública: clau anònima i sense galetes. L'RLS només deixa llegir la carta, el padró i les paraules. */

interface FilaPlat {
  slug: string;
  name: string;
  section: Plat["seccio"];
  price_cents: number;
  season: Plat["temporada"];
  tags: string[];
  allergens: string[];
  que_queda_ok: boolean;
  available: boolean;
  description: Record<Idioma, string>;
  supplement: { name: string; price_cents: number } | null;
}

/** La carta tal com la deixa l'amo des del panell. Si la base de dades no respon, la carta de docs/CARTA.md. */
export const cartaPublica = cache(async (): Promise<Plat[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clau = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clau) return cartaLocal;
  try {
    const supabase = createClient(url, clau, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from("dishes")
      .select("slug, name, section, price_cents, season, tags, allergens, que_queda_ok, available, description, supplement")
      .order("sort");
    if (error || !data?.length) return cartaLocal;
    return (data as FilaPlat[]).map((d) => ({
      slug: d.slug,
      nom: d.name,
      seccio: d.section,
      preu: d.price_cents,
      temporada: d.season,
      etiquetes: d.tags,
      alergens: d.allergens,
      queQuedaOk: d.que_queda_ok,
      disponible: d.available,
      descripcio: d.description,
      suplement: d.supplement ? { nom: d.supplement.name, preu: d.supplement.price_cents } : undefined,
    }));
  } catch {
    return cartaLocal;
  }
});

export interface IngredientPublic {
  slug: string;
  nom: string;
  comarca: string | null;
  temporada: string;
  estat: "empadronat" | "alta-proposada" | "baixa-proposada" | "ve-aviat" | "de-baixa";
  alta: string | null;
  baixa: string | null;
}

/** El padró d'ingredients tal com el deixa l'amo (taula `ingredients`, lectura pública). */
export const padroPublic = cache(async (): Promise<IngredientPublic[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clau = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clau) return [];
  try {
    const supabase = createClient(url, clau, { auth: { persistSession: false } });
    const { data } = await supabase.from("ingredients").select("slug, name, comarca, season, status, alta_on, baixa_on, alta_label, baixa_label").order("id");
    return (data ?? []).map((i) => ({
      slug: i.slug,
      nom: i.name,
      comarca: i.comarca,
      temporada: i.season,
      estat: i.status,
      alta: i.alta_label ?? i.alta_on,
      baixa: i.baixa_label ?? i.baixa_on,
    }));
  } catch {
    return [];
  }
});
