"use server";

import { cookies } from "next/headers";
import { IDIOMES, type Locale } from "@/i18n/request";

/** Idioma del panell: galeta pròpia, perquè no canviï l'idioma de la web pública. */
export async function canviaIdiomaPanell(l: Locale) {
  if (!IDIOMES.includes(l)) return;
  (await cookies()).set("PANEL_LOCALE", l, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
