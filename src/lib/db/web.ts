import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { plats as cartaLocal, nutricioValida, type Idioma, type Plat } from "@/lib/data/carta";
import { deDiaIso, diaMes } from "@/lib/dates";

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
  image_url: string | null;
  nutrition: unknown;
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
      .select("slug, name, section, price_cents, season, tags, allergens, que_queda_ok, available, description, supplement, image_url, nutrition")
      .eq("archived", false)
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
      imatge: d.image_url ?? undefined,
      nutricio: nutricioValida(d.nutrition),
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

export interface AnunciPadro {
  id: string;
  tipus: "alta" | "baixa";
  ingredient: string;
  text: string;
  data: string;
}

/** Els anuncis del padró aprovats per l'amo (últims 60 dies), en l'idioma de la visita (si no n'hi ha, en català). */
export const anuncisPadro = cache(async (idioma: Idioma): Promise<AnunciPadro[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clau = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clau) return [];
  try {
    const supabase = createClient(url, clau, { auth: { persistSession: false } });
    const { data } = await supabase.rpc("padro_anuncis");
    return ((data ?? []) as {
      id: string;
      kind: "alta" | "baixa";
      ingredient: string;
      announcement: string;
      announcement_es: string | null;
      announcement_en: string | null;
      alta_on: string | null;
      baixa_on: string | null;
      resolved_at: string;
    }[]).map((a) => {
      const traduit = idioma === "es" ? a.announcement_es : idioma === "en" ? a.announcement_en : null;
      const data = (d: string | null) => (d ? diaMes(deDiaIso(d), idioma) : "—");
      return {
        id: a.id,
        tipus: a.kind,
        ingredient: a.ingredient,
        text: (traduit ?? a.announcement).replace(/\{\{(alta|baixa)\}\}/g, (_, k) => data(k === "alta" ? a.alta_on : a.baixa_on)),
        data: diaMes(a.resolved_at, idioma),
      };
    });
  } catch {
    return [];
  }
});
