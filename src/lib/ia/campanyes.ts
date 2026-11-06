import "server-only";
import type { Campanya, TipusCampanya, To } from "@/lib/data/campanyes";
import type { Idioma, Plat } from "@/lib/data/carta";
import { diesSetmana } from "@/lib/dates";
import { percent } from "@/lib/format";
import { netejaText, redactaJson, type Redaccio } from "./gemini";
import { sistemaClients } from "./prompts";

// Campanyes: la IA redacta (missatges, per què, titular); el codi decideix a qui s'envia i ho desa com a esborrany.

const TONS: To[] = ["original", "curt", "calid", "senseExtra"];
const IDIOMES: Idioma[] = ["ca", "es", "en"];

const esquemaIdiomes = {
  type: "object",
  properties: { ca: { type: "string" }, es: { type: "string" }, en: { type: "string" } },
  required: IDIOMES,
  additionalProperties: false,
};
const esquemaMissatges = {
  type: "object",
  description: "El mateix avís en 4 tons i 3 idiomes",
  properties: {
    original: { ...esquemaIdiomes, description: "Versió principal, de 25 a 45 paraules" },
    curt: { ...esquemaIdiomes, description: "Versió curta, de 10 a 20 paraules" },
    calid: { ...esquemaIdiomes, description: "Versió més càlida i propera, de 25 a 45 paraules" },
    senseExtra: { ...esquemaIdiomes, description: "La versió principal sense el detall secundari (per exemple, sense esmentar un plat concret)" },
  },
  required: TONS,
  additionalProperties: false,
};

type Missatges = Campanya["missatges"];

export const esMissatges = (x: unknown): x is Missatges =>
  typeof x === "object" && x !== null && TONS.every((t) => IDIOMES.every((i) => typeof (x as Missatges)[t]?.[i] === "string"));

/**
 * Les variables no es poden perdre ni inventar: només {nom} i {paraula}. Si el missatge de partida
 * duia {nom}, l'han de dur tots els tons; si duia {paraula}, almenys la versió principal.
 */
export function conservaVariables(nous: Missatges, model: Missatges | null): boolean {
  const textos = TONS.flatMap((t) => IDIOMES.map((i) => nous[t][i]));
  if (textos.some((x) => (x.match(/\{[^}]*\}/g) ?? []).some((v) => v !== "{nom}" && v !== "{paraula}"))) return false;
  const teNom = !model || IDIOMES.some((i) => model.original[i].includes("{nom}"));
  const teParaula = model && IDIOMES.some((i) => model.original[i].includes("{paraula}"));
  if (teNom && !textos.every((x) => x.includes("{nom}"))) return false;
  return !teParaula || IDIOMES.every((i) => nous.original[i].includes("{paraula}"));
}

const netejaMissatges = (m: Missatges): Missatges =>
  Object.fromEntries(TONS.map((t) => [t, Object.fromEntries(IDIOMES.map((i) => [i, netejaText(m[t][i]).replace(/\*\*/g, "")]))])) as Missatges;

const VARIABLES =
  "Fes servir les variables literals {nom} (nom de pila del client) i {paraula} (la paraula que li falta al carnet) on toqui; s'omplen per a cada client. Escriu-les exactament així, amb les claus.";

/** Reescriu els missatges d'una campanya existent amb la veu de marca actual, sense canviar l'oferta. */
export async function redactaMissatges(c: Campanya): Promise<Redaccio<Missatges> | null> {
  const peticio = [
    `Reescriu els missatges d'aquesta campanya amb la veu de marca. Mantén exactament la mateixa oferta, els mateixos dies, hores, plats i condicions: no afegeixis ni treguis cap fet.`,
    `Campanya: ${c.titol}`,
    `Per què: ${c.perQue.map((p) => p.replace(/\*\*/g, "")).join(" ")}`,
    `Missatges actuals (els fets bons):\n${IDIOMES.map((i) => `${i}: ${c.missatges.original[i]}`).join("\n")}`,
    `La versió «senseExtra» és: ${c.senseExtra ?? "la principal sense el detall secundari"}.`,
    VARIABLES,
  ].join("\n\n");
  const r = await redactaJson(await sistemaClients(), peticio, esquemaMissatges, esMissatges);
  if (!r) return null;
  const valor = netejaMissatges(r.valor);
  return conservaVariables(valor, c.missatges) ? { ...r, valor } : null;
}

/* Campanya nova a partir del que demana l'amo */

export interface CampanyaIA {
  tipus: TipusCampanya;
  segment: "risc" | "tots";
  titol: string;
  perQue: string[];
  etiquetaSenseExtra: string;
  dia: number;
  hora: string;
  motiuHora: string;
  missatges: Missatges;
}

const esquemaCampanya = {
  type: "object",
  properties: {
    tipus: { type: "string", enum: ["recuperacio", "franja", "padro", "calendari"], description: "recuperacio: recuperar clients; franja: omplir hores fluixes; padro: un ingredient que entra o surt; calendari: una data o festa" },
    segment: { type: "string", enum: ["risc", "tots"], description: "risc: només clients en risc; tots: tots els clients amb el carnet al wallet" },
    titol: { type: "string", description: "Titular de la proposta per a l'amo, de 4 a 9 paraules, en català" },
    perQue: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3, description: "Per què ara, amb les dades, en català per a l'amo" },
    etiquetaSenseExtra: { type: "string", description: "Etiqueta curta del botó de la versió sense el detall secundari, p. ex. «Sense el fricandó»" },
    dia: { type: "integer", minimum: 1, maximum: 6, description: "Dia d'enviament: 1 dilluns … 6 dissabte (diumenge tanquem)" },
    hora: { type: "string", description: "Hora d'enviament HH:MM, entre les 10:00 i les 19:00" },
    motiuHora: { type: "string", description: "Per què aquest dia i hora, en una frase curta en català" },
    missatges: esquemaMissatges,
  },
  required: ["tipus", "segment", "titol", "perQue", "etiquetaSenseExtra", "dia", "hora", "motiuHora", "missatges"],
  additionalProperties: false,
};

export const esCampanya = (x: unknown): x is CampanyaIA => {
  const c = x as CampanyaIA;
  return (
    typeof c === "object" &&
    c !== null &&
    ["recuperacio", "franja", "padro", "calendari"].includes(c.tipus) &&
    ["risc", "tots"].includes(c.segment) &&
    typeof c.titol === "string" &&
    Array.isArray(c.perQue) &&
    Number.isInteger(c.dia) &&
    /^\d{1,2}:\d{2}$/.test(c.hora) &&
    esMissatges(c.missatges)
  );
};

/** El mínim de cada client que cal per als fets del negoci (cap nom ni dada personal). */
export interface ClientFets {
  risc: boolean;
  wallet: boolean;
  consentiment: boolean;
  paraules: number;
}

export function fetsNegoci(
  clients: ClientFets[],
  franges: { mitjanaFluixes: number; mitjanaMigdia: number },
  carta: Pick<Plat, "nom" | "disponible" | "seccio">[],
): string[] {
  const risc = clients.filter((c) => c.risc);
  return [
    `Clients amb carnet: ${clients.length}. Amb el carnet al wallet: ${clients.filter((c) => c.wallet).length}. Accepten correu: ${clients.filter((c) => c.consentiment).length}.`,
    `Clients en risc: ${risc.length} (${percent(clients.length ? risc.length / clients.length : 0)} dels clients). ${risc.filter((c) => 8 - c.paraules <= 3).length} estan a 3 paraules o menys de completar el carnet.`,
    `Franges fluixes: ${franges.mitjanaFluixes} comandes de mitjana, quan el migdia en fa ${franges.mitjanaMigdia}.`,
    `Carta disponible: ${carta
      .filter((p) => p.disponible && p.seccio !== "begudes")
      .map((p) => p.nom)
      .join(", ")}.`,
    "El carnet té 8 paraules; completar-lo dona unes postres de regal. Les recompenses són paraules i producte, mai descomptes.",
    `Avui és ${diesSetmana[new Date().getDay()]}. Obrim de dilluns a dissabte, migdia (12–16 h) i vespre (19–23 h).`,
  ];
}

export async function redactaCampanyaNova(objectiu: string, fets: string[]): Promise<Redaccio<CampanyaIA> | null> {
  const peticio = [
    `L'amo demana aquesta campanya: «${objectiu}»`,
    "Proposa-la: tria el tipus i el grup, escriu el titular i el per què per a l'amo (en català), proposa el dia i l'hora d'enviament i redacta el missatge per als clients en 4 tons i 3 idiomes.",
    `Dades del negoci:\n${fets.map((f) => `- ${f}`).join("\n")}`,
    VARIABLES,
  ].join("\n\n");
  const r = await redactaJson(await sistemaClients(), peticio, esquemaCampanya, esCampanya);
  if (!r) return null;
  const valor: CampanyaIA = {
    ...r.valor,
    titol: netejaText(r.valor.titol).replace(/\*\*/g, ""),
    perQue: r.valor.perQue.map(netejaText),
    missatges: netejaMissatges(r.valor.missatges),
  };
  return conservaVariables(valor.missatges, null) ? { ...r, valor } : null;
}
