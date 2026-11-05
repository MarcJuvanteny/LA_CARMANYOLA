import "server-only";
import type { Client, Segment } from "@/lib/data/clients";
import type { AvisPadro, Ingredient } from "@/lib/data/padro";
import type { DadesVendes, Periode } from "@/lib/data/vendes";
import { diesSetmana } from "@/lib/dates";
import { euros, percent } from "@/lib/format";
import { netejaText, redacta, redactaJson, type Redaccio } from "./gemini";
import { esTargeta, esquemaTargeta, sistemaAmo, sistemaClients, type Targeta } from "./prompts";

// Fets per a la IA: cadenes ja formatades (SQL calcula, el codi formata, la IA redacta).
// Només agregats: cap nom ni dada personal de cap client (CONTEXT.md §9.5).

const llistaFets = (fets: string[]) => fets.map((f) => `- ${f}`).join("\n");
const variacio = (actual: number, anterior: number) => (anterior ? percent(actual / anterior - 1, { signe: true }) : "sense comparació");

const netejaTargeta = (t: Targeta): Targeta => ({
  titol: netejaText(t.titol).replace(/\*\*/g, ""),
  punts: t.punts.map(netejaText).filter(Boolean),
});

async function redactaTargeta(encarrec: string, fets: string[]): Promise<Redaccio<Targeta> | null> {
  const r = await redactaJson(await sistemaAmo(), `${encarrec}\n\nDades:\n${llistaFets(fets)}`, esquemaTargeta, esTargeta);
  return r && { ...r, valor: netejaTargeta(r.valor) };
}

/* Vendes */

const anterior: Record<Periode, string> = { avui: "el mateix dia de la setmana passada", setmana: "la setmana passada", mes: "les 4 setmanes anteriors" };

export function fetsVendes(periode: Periode, d: DadesVendes, dinarAnterior: number): string[] {
  const unitat = periode === "avui" ? "franja" : periode === "setmana" ? "dia" : "setmana";
  return [
    `Període: ${d.subtitol}.`,
    `Ingressos: ${euros(d.ingressos, { senseDecimals: true })} (${anterior[periode]}: ${euros(d.ingressosAnteriors, { senseDecimals: true })}, ${variacio(d.ingressos, d.ingressosAnteriors)}).`,
    `Comandes: ${d.comandes} (${anterior[periode]}: ${d.comandesAnteriors}). Tiquet mitjà: ${euros(d.tiquetMitja)} (abans ${euros(d.tiquetMitjaAnterior)}).`,
    `Ingressos per ${unitat}: ${d.perDia.map((b) => `${b.etiqueta} ${euros(b.actual, { senseDecimals: true })} (abans ${euros(b.anterior, { senseDecimals: true })})`).join("; ")}.`,
    `Plats més venuts: ${d.plats
      .filter((p) => p.unitats > 0)
      .slice(0, 6)
      .map((p) => `${p.nom} ${p.unitats} u. (${percent(p.variacio, { signe: true })} vs ${anterior[periode]})`)
      .join("; ")}.`,
    `El Dinar (suplement): ${percent(d.ambDinar)} de les comandes (${anterior[periode]}: ${percent(dinarAnterior)}). Surt a la fitxa de cada plat.`,
    `Canal: web i local ${euros(d.canal.web, { senseDecimals: true })}, plataformes ${euros(d.canal.plataformes, { senseDecimals: true })} (comissions ${euros(d.canal.comissions, { senseDecimals: true })}).`,
    "Context: és tardor; L'Esqueixat és l'únic plat fred de la carta.",
  ];
}

export const redactaVendes = (fets: string[]) =>
  redactaTargeta(
    "Escriu la targeta «Què hi veu la IA» de la pantalla de Vendes: un titular i 2 o 3 punts amb el que més destaca (millor i pitjor moment, el plat que puja o baixa i, si té sentit, què faries).",
    fets,
  );

/* Franges */

export function fetsFranges(fluixes: { dow: number; slot: string }[], mitjanaFluixes: number, mitjanaMigdia: number, prova: number | null): string[] {
  return [
    `Les franges més fluixes de la setmana: ${fluixes.map((f) => `${diesSetmana[f.dow % 7]} ${f.slot.replace("-", " a ")} h`).join(", ") || "cap"}.`,
    `Comandes de mitjana en aquestes franges: ${mitjanaFluixes}. Al migdia: ${mitjanaMigdia}.`,
    prova == null
      ? "Encara no s'ha provat mai el segell doble en cap franja."
      : `L'última prova de segell doble (dilluns al vespre) va canviar les comandes un ${percent(prova, { signe: true })}.`,
    "La proposta és el segell doble: cada carmanyola suma dues paraules al carnet en aquestes franges. No és un descompte i el preu no es toca.",
  ];
}

export const redactaFranges = (fets: string[]) =>
  redactaTargeta(
    "Escriu la proposta de la pantalla de Franges: un titular que digui on posar el segell doble (dies i hores) i 3 punts que l'expliquin amb les dades.",
    fets,
  );

/* Clients */

type ClientIA = Client & { laborables: number; wallet: boolean };

export function fetsClients(segment: Exclude<Segment, "tots">, tots: ClientIA[]): string[] | null {
  const grup = tots.filter((c) => c.segments.includes(segment));
  if (!grup.length) return null;
  const preferits = Object.entries(
    grup.reduce<Record<string, number>>((m, c) => ((m[c.platPreferit] = (m[c.platPreferit] ?? 0) + 1), m), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([p, n]) => `${p} (${n})`)
    .join(", ");
  const descripcio = {
    risc: "Clients en risc: habituals que fa més dies del normal que no demanen.",
    nous: "Clients nous: s'han donat d'alta al carnet els últims 30 dies.",
    adormits: "Clients adormits: fa més d'un mes i mig que no demanen.",
  }[segment];
  return [
    descripcio,
    `Són ${grup.length} de ${tots.length} clients amb carnet.`,
    `${grup.filter((c) => c.comandes && c.laborables / c.comandes >= 0.5).length} demanaven sobretot al migdia entre setmana (zona d'oficines del 22@).`,
    `Dies sense demanar, de mitjana: ${Math.round(grup.reduce((s, c) => s + c.senseVenir, 0) / grup.length)}.`,
    `Comandes per client, de mitjana: ${(grup.reduce((s, c) => s + c.comandes, 0) / grup.length).toFixed(1).replace(".", ",")}. ${grup.filter((c) => c.comandes >= 2).length} n'han fet dues o més.`,
    `${grup.filter((c) => 8 - c.paraules <= 3).length} estan a 3 paraules o menys de completar el carnet (8 paraules).`,
    `${grup.filter((c) => c.wallet).length} tenen el carnet al wallet; la resta només es poden avisar per correu.`,
    `Plats preferits més repetits: ${preferits}. L'Esqueixat és un plat fred i ara és tardor.`,
  ];
}

export const redactaClients = (fets: string[]) =>
  redactaTargeta(
    "Escriu la targeta de la IA per a aquest grup de clients: un titular que expliqui qui són o què els passa i 3 punts amb les dades que ho justifiquen.",
    fets,
  );

/* Padró */

export interface AvisRedactat extends Targeta {
  anunci: string;
}

const esquemaAvis = {
  type: "object",
  properties: {
    ...esquemaTargeta.properties,
    anunci: { type: "string", description: "Avís per als clients, de 20 a 40 paraules, amb la veu de marca" },
  },
  required: ["titol", "punts", "anunci"],
  additionalProperties: false,
};
const esAvis = (x: unknown): x is AvisRedactat => esTargeta(x) && typeof (x as AvisRedactat).anunci === "string";

export function fetsPadro(a: AvisPadro, ing: Ingredient | undefined): string[] {
  return [
    a.tipus === "alta" ? `Proposta d'alta al padró: ${ing?.nom ?? a.ingredient}.` : `Proposta de baixa del padró: ${ing?.nom ?? a.ingredient}.`,
    ing?.comarca ? `Ve de: ${ing.comarca}.` : "",
    `Estació: ${ing?.estacio ?? "—"}. ${a.tipus === "alta" ? `Alta: ${ing?.alta ?? "—"}` : `Baixa: ${ing?.baixa ?? "—"}`}.`,
    ing?.plats.length ? `Plats on surt: ${ing.plats.join(", ")}.` : "",
    ...a.punts.map((p) => p.replace(/\*\*/g, "")),
  ].filter(Boolean);
}

export async function redactaPadro(fets: string[]): Promise<Redaccio<AvisRedactat> | null> {
  const sistema = `${await sistemaAmo()}\n\nL'«anunci» és diferent: és el text que llegiran els clients. Escriu-lo seguint aquestes normes:\n${await sistemaClients()}`;
  const r = await redactaJson(
    sistema,
    `Escriu l'avís del padró per a l'amo: un titular, 3 punts que l'expliquin amb les dades i l'anunci per als clients.\n\nDades:\n${llistaFets(fets)}`,
    esquemaAvis,
    esAvis,
  );
  return r && { ...r, valor: { ...netejaTargeta(r.valor), anunci: netejaText(r.valor.anunci).replace(/\*\*/g, "") } };
}

/* Què Queda: l'avís als clients amb carnet */

export async function redactaQueQueda(plats: { n: number; nom: string }[], base: string): Promise<string | null> {
  const r = await redacta(
    await sistemaClients(),
    [
      "Escriu l'avís del Què Queda: el que ha sobrat del servei, només per als clients amb carnet. De 20 a 40 paraules. Mai diguis «restes» ni «sobres».",
      `Plats i quantitats (copia-les exactament): ${plats.map((p) => `${p.n} ${p.nom}`).join(", ")}.`,
      `Avís actual, amb l'horari bo (respecta'l): ${base}`,
      "Escriu-lo en català.",
    ].join("\n\n"),
  );
  if (!r) return null;
  const text = netejaText(r.valor).replace(/\*\*/g, "");
  // Les quantitats les posa el codi: si la IA n'ha canviat alguna, no es fa servir.
  return plats.every((p) => text.includes(String(p.n))) ? text : null;
}
