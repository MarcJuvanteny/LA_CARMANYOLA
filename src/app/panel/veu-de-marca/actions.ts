"use server";

import type { Idioma } from "@/lib/data/carta";
import { encarrecsVeu, provesVeu, situacions, type Situacio } from "@/lib/data/veu";
import { netejaText, redacta } from "@/lib/ia/gemini";
import { gastaQuota } from "@/lib/ia/quota";
import { supabaseServidor } from "@/lib/supabase/server";

const nomIdioma: Record<Idioma, string> = { ca: "català", es: "castellà", en: "anglès" };

export interface ProvaVeu {
  text: string;
  /** "ia" si l'ha escrit el model; "exemple" si la IA no ha respost i es mostra el text de mostra. */
  font: "ia" | "exemple";
}

/** Zona de proves de la veu de marca: la IA escriu l'avís amb `veu` com a prompt de sistema. */
export async function provaVeu(situacio: Situacio, idioma: Idioma, veu: string): Promise<ProvaVeu> {
  if (!situacions.includes(situacio) || !["ca", "es", "en"].includes(idioma)) {
    throw new Error("Petició no vàlida");
  }
  // Només l'amo: cada prova gasta quota del model.
  const supabase = await supabaseServidor();
  const { data: esAmo } = await supabase.rpc("is_owner");
  if (!esAmo) throw new Error("Només l'amo");
  if (!(await gastaQuota("veu"))) return { text: provesVeu[situacio][idioma], font: "exemple" };

  const sistema = [
    "Escrius els avisos de La Carmanyola als seus clients (wallet i correu). Aquesta és la veu de marca i l'has de seguir al peu de la lletra:",
    veu.slice(0, 6000),
    "Normes de format: només el text de l'avís, sense títol, sense cometes, sense emojis i sense markdown. Un sol missatge, de 25 a 45 paraules. No t'inventis cap dada que no et donin. Els noms dels plats sempre en català, encara que escriguis en un altre idioma.",
  ].join("\n\n");
  const peticio = `${encarrecsVeu[situacio]}\n\nEscriu l'avís en ${nomIdioma[idioma]}.`;

  const r = await redacta(sistema, peticio);
  if (!r) return { text: provesVeu[situacio][idioma], font: "exemple" };
  return { text: netejaText(r.valor).replace(/\*\*/g, ""), font: "ia" };
}
