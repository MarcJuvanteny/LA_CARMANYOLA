import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import ca from "../../messages/ca.json";

// El panell de l'amo és sempre en català (el proxy marca les seves peticions amb `x-zona: panel`).
// La web pública: la galeta NEXT_LOCALE (selector de la capçalera) o, si no n'hi ha, l'idioma del navegador.
// Sense prefix a l'URL: el QR de la faixa i el del carnet han de funcionar igual per a tothom.
export const IDIOMES = ["ca", "es", "en"] as const;
export type Locale = (typeof IDIOMES)[number];

type Missatges = Record<string, unknown>;

/** El que no està traduït, en català. */
function fusiona(base: Missatges, sobre: Missatges): Missatges {
  const out: Missatges = { ...base };
  for (const [k, v] of Object.entries(sobre)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" ? fusiona(base[k] as Missatges, v as Missatges) : v;
  }
  return out;
}

async function triaIdioma(): Promise<Locale> {
  const h = await headers();
  if (h.get("x-zona") === "panel") return "ca";
  const galeta = (await cookies()).get("NEXT_LOCALE")?.value;
  if (IDIOMES.includes(galeta as Locale)) return galeta as Locale;
  // Accept-Language: "es-ES,es;q=0.9,ca;q=0.8" → el primer que tinguem.
  for (const part of (h.get("accept-language") ?? "").split(",")) {
    const l = part.trim().slice(0, 2).toLowerCase();
    if (IDIOMES.includes(l as Locale)) return l as Locale;
  }
  return "ca";
}

export default getRequestConfig(async () => {
  const locale = await triaIdioma();
  const messages = locale === "ca" ? ca : fusiona(ca, (await import(`../../messages/${locale}.json`)).default);
  return { locale, timeZone: "Europe/Madrid", messages };
});
