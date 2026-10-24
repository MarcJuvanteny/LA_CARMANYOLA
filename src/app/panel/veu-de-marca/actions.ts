"use server";

import type { Idioma } from "@/lib/data/carta";
import { provesVeu, situacions, type Situacio } from "@/lib/data/veu";

/**
 * Zona de proves de la veu de marca. Només al servidor: aquí anirà la crida
 * al model amb `veu` com a prompt de sistema. De moment respon amb exemples.
 */
export async function provaVeu(situacio: Situacio, idioma: Idioma, veu: string): Promise<string> {
  if (!situacions.includes(situacio) || !["ca", "es", "en"].includes(idioma)) {
    throw new Error("Petició no vàlida");
  }
  void veu;
  await new Promise((r) => setTimeout(r, 700));
  return provesVeu[situacio][idioma];
}
