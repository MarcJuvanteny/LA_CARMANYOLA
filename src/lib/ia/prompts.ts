import "server-only";
import type { Locale } from "@/i18n/idiomes";
import { serviceClient } from "@/lib/sim/db";

// Instruccions de sistema compartides. La veu de marca (taula brand_voice) és el prompt (CONTEXT.md §9.4).

export async function veuDeMarca(): Promise<string> {
  const { data } = await serviceClient().from("brand_voice").select("title, body").order("sort");
  return (data ?? []).map((s) => `## ${s.title}\n${s.body}`).join("\n\n");
}

const NUMEROS =
  "Els números ja estan calculats: fes servir només els que et dono i copia'ls exactament com te'ls dono (amb el mateix format). No t'inventis cap dada, cap percentatge ni cap causa que no surti de les dades.";

/** Nom de l'idioma per a les instruccions ("en català", "en castellà", "en anglès"). */
export const NOM_IDIOMA: Record<Locale, string> = { ca: "català", es: "castellà", en: "anglès" };

/** Per a les targetes grogues del panell: la IA parla amb l'amo, en l'idioma del panell. */
export async function sistemaAmo(idioma: Locale = "ca") {
  const extra =
    idioma === "ca"
      ? ""
      : ` Les dades te les dono en català, però tu escriu-ho tot en ${NOM_IDIOMA[idioma]}${idioma === "es" ? " (tuteja)" : ""}. Els noms dels plats, «el Dinar», «el Què Queda» i les paraules del carnet es queden en català.`;
  return [
    `Ets l'analista de La Carmanyola, un restaurant de cuina catalana per emportar al Poblenou. Escrius les targetes del panell per a l'amo: en ${NOM_IDIOMA[idioma]}, tutejant-lo, directe i amb frases curtes. Expliques què diuen les dades i, si cal, proposes una acció concreta.${extra}`,
    NUMEROS,
    "Pots marcar en **negreta** la xifra més important de cada punt. Res més de markdown.",
    "Respecta el vocabulari i les regles de la marca:",
    await veuDeMarca(),
  ].join("\n\n");
}

/** Per als avisos i les campanyes: la IA escriu als clients amb la veu de marca. */
export async function sistemaClients() {
  return [
    "Escrius els avisos de La Carmanyola als seus clients (wallet i correu). Aquesta és la veu de marca i l'has de seguir al peu de la lletra:",
    await veuDeMarca(),
    NUMEROS,
    "Normes de format: només el text de l'avís, sense títol, sense cometes, sense emojis i sense markdown. Els noms dels plats sempre en català, encara que escriguis en un altre idioma.",
  ].join("\n\n");
}

/* Esquemes i validadors comuns */

export interface Targeta {
  titol: string;
  punts: string[];
}

export const esquemaTargeta = {
  type: "object",
  properties: {
    titol: { type: "string", description: "Titular de 4 a 9 paraules que resumeix la idea principal" },
    punts: { type: "array", items: { type: "string", description: "Una frase curta" }, minItems: 2, maxItems: 3 },
  },
  required: ["titol", "punts"],
  additionalProperties: false,
};

export const esTargeta = (x: unknown): x is Targeta =>
  typeof x === "object" && x !== null && typeof (x as Targeta).titol === "string" && Array.isArray((x as Targeta).punts) && (x as Targeta).punts.every((p) => typeof p === "string");
