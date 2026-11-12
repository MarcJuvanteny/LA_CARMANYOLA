// Redacció provisional de les targetes de la IA (el que es veu mentre el model no ha redactat res, o si no hi és).
// Els números ja arriben calculats per SQL (CONTEXT.md §9.1); aquí només es posen en frases,
// en l'idioma del panell: els textos són a messages/*.json, a `panel.plantilles`.

import type { Locale } from "@/i18n/idiomes";
import { majuscula, nomsDies, nomsDiesCurts } from "@/lib/dates";
import type { Client, Segment } from "@/lib/data/clients";
import type { DadesVendes, Periode } from "@/lib/data/vendes";
import { euros, percent } from "@/lib/format";

/** La `t` de next-intl per a `panel.plantilles`. */
export type T = (clau: string, valors?: Record<string, string | number>) => string;

const PLATS_FREDS = ["L'Esqueixat"];
const PLATS_TARDOR = ["Fricandó amb Bolets", "La Castanyera"];

export function vendes(periode: Periode, d: DadesVendes, dinarAnterior: number, t: T, l: Locale) {
  const punts: string[] = [];
  const amb = d.perDia.filter((b) => b.actual > 0);
  const plats = d.plats.filter((p) => p.unitats > 0);
  const anterior = t(`anterior.${periode}`);

  if (amb.length >= 2) {
    const millor = amb.reduce((m, b) => (b.actual > m.actual ? b : m));
    const pitjor = amb.reduce((m, b) => (b.actual < m.actual ? b : m));
    // Les etiquetes del gràfic: franges ("13-14"), dies curts ("Dt") o setmanes ("3 nov").
    const nom = (e: string) => {
      const i = nomsDiesCurts(l).indexOf(e);
      return i >= 0 ? nomsDies(l)[i] : periode === "avui" ? t("franjaDe", { e }) : t("setmanaDel", { e });
    };
    punts.push(
      t("millorPitjor", {
        millor: majuscula(nom(millor.etiqueta)),
        pitjor: nom(pitjor.etiqueta),
        periode,
        v: euros(millor.actual, { senseDecimals: true }),
        v2: euros(pitjor.actual, { senseDecimals: true }),
      }),
    );
  }

  const baixa = [...plats].sort((a, b) => a.variacio - b.variacio)[0];
  const puja = [...plats].sort((a, b) => b.variacio - a.variacio)[0];
  if (baixa && baixa.variacio < -0.04) {
    punts.push(t(PLATS_FREDS.includes(baixa.nom) ? "baixaFred" : "baixa", { plat: baixa.nom, p: percent(-baixa.variacio), anterior }));
  } else if (puja && puja.variacio > 0.04) {
    punts.push(t("puja", { plat: puja.nom, p: percent(puja.variacio), anterior }));
  }

  if (d.comandes > 0) {
    punts.push(
      d.ambDinar > dinarAnterior + 0.01
        ? t("dinarPuja", { a: percent(dinarAnterior), b: percent(d.ambDinar) })
        : t("dinar", { a: percent(d.ambDinar), b: percent(dinarAnterior), anterior }),
    );
  }

  const top = plats[0];
  const titol = !top
    ? t("titolBuit")
    : baixa && baixa.variacio < -0.04 && baixa.nom !== top.nom
      ? t("titolTiraApaga", { top: top.nom, baixa: baixa.nom })
      : t("titolTira", { top: top.nom });
  return { titol, punts: punts.length ? punts : [t("senseComandes")] };
}

export function franges(fluixes: { dow: number; slot: string }[], mitjanaFluixes: number, mitjanaMigdia: number, prova: number | null, t: T, l: Locale) {
  const dies = [...new Set(fluixes.map((f) => f.dow))].sort().map((d) => nomsDies(l)[d % 7]);
  const hores = fluixes.flatMap((f) => f.slot.split("-").map(Number));
  const tram = hores.length ? t("tram", { a: Math.min(...hores), b: Math.max(...hores) }) : "";
  return {
    titol: fluixes.length ? t("segellDoble", { dies: new Intl.ListFormat(l, { type: "conjunction" }).format(dies), tram }) : t("senseFluixes"),
    punts: [
      t("fluixes", { f: mitjanaFluixes, m: mitjanaMigdia }),
      prova == null ? t("senseProva") : t("prova", { p: percent(prova, { signe: true }) }),
      t("cost"),
    ],
    nota: t("notaFranges"),
  };
}

type Proposta = { titol: string; punts: string[]; accio: string } | null;

export function clients(tots: (Client & { laborables: number; tarda: number; wallet: boolean })[], t: T): Record<Segment, Proposta> {
  const de = (s: Segment) => tots.filter((c) => c.segments.includes(s));
  const risc = de("risc");
  const nous = de("nous");
  const adormits = de("adormits");

  const oficina = risc.filter((c) => c.comandes && c.laborables / c.comandes >= 0.5).length;
  const freds = risc.filter((c) => PLATS_FREDS.includes(c.platPreferit)).length;
  const aProp = risc.filter((c) => 8 - c.paraules <= 3).length;

  return {
    tots: null,
    risc: risc.length
      ? {
          titol: t(oficina > risc.length / 2 ? "risc.oficina" : "risc.despistats"),
          punts: [
            t("risc.migdia", { n: oficina, total: risc.length }),
            freds ? t("risc.freds", { n: freds }) : t("risc.dies", { n: Math.round(risc.reduce((s, c) => s + c.senseVenir, 0) / risc.length) }),
            t("risc.aProp", { n: aProp }),
          ],
          accio: t("creaCampanya"),
        }
      : null,
    nous: nous.length
      ? {
          titol: t("nous.titol"),
          punts: [
            t("nous.alta", { n: nous.length }),
            t("nous.tornat", { n: nous.filter((c) => c.comandes >= 2).length }),
            t("nous.tardor", { n: nous.filter((c) => PLATS_TARDOR.includes(c.platPreferit)).length }),
          ],
          accio: t("nous.accio"),
        }
      : null,
    adormits: adormits.length
      ? {
          titol: t("adormits.titol"),
          punts: [
            t("adormits.poques", { n: adormits.filter((c) => c.comandes <= 2).length, total: adormits.length }),
            t("adormits.wallet", { n: adormits.filter((c) => c.wallet).length }),
            t("adormits.freds", { n: adormits.filter((c) => PLATS_FREDS.includes(c.platPreferit)).length }),
          ],
          accio: t("creaCampanya"),
        }
      : null,
  };
}
