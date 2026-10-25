// Redacció provisional de les targetes de la IA.
// Els números ja arriben calculats per SQL (CONTEXT.md §9.1); aquí només es posen en frases.
// Quan hi hagi el model, aquestes funcions seran el "context" que se li passa des del servidor.

import { diesSetmana } from "@/lib/dates";
import type { Client, Segment } from "@/lib/data/clients";
import type { DadesVendes, Periode } from "@/lib/data/vendes";
import { euros, percent } from "@/lib/format";

const anterior: Record<Periode, string> = { avui: "fa una setmana", setmana: "la setmana passada", mes: "les 4 setmanes anteriors" };
const PLATS_FREDS = ["L'Esqueixat"];
const majuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function vendes(periode: Periode, d: DadesVendes, dinarAnterior: number) {
  const punts: string[] = [];
  const amb = d.perDia.filter((b) => b.actual > 0);
  const plats = d.plats.filter((p) => p.unitats > 0);

  if (amb.length >= 2) {
    const millor = amb.reduce((m, b) => (b.actual > m.actual ? b : m));
    const pitjor = amb.reduce((m, b) => (b.actual < m.actual ? b : m));
    const nom = (e: string) => {
      const i = ["Dg", "Dl", "Dt", "Dc", "Dj", "Dv", "Ds"].indexOf(e);
      return i >= 0 ? majuscula(diesSetmana[i]) : periode === "avui" ? `La franja de ${e} h` : `La setmana del ${e}`;
    };
    punts.push(
      `${nom(millor.etiqueta)} ha estat ${periode === "avui" ? "la millor franja" : periode === "setmana" ? "el millor dia" : "la millor setmana"} (**${euros(millor.actual, { senseDecimals: true })}**) i ${nom(pitjor.etiqueta).toLowerCase()} ${periode === "avui" ? "la més fluixa" : "el més fluix"} (${euros(pitjor.actual, { senseDecimals: true })}).`,
    );
  }

  const baixa = [...plats].sort((a, b) => a.variacio - b.variacio)[0];
  const puja = [...plats].sort((a, b) => b.variacio - a.variacio)[0];
  if (baixa && baixa.variacio < -0.04) {
    punts.push(
      PLATS_FREDS.includes(baixa.nom)
        ? `${baixa.nom} baixa un ${percent(-baixa.variacio)}: és un plat fred i ha arribat la tardor. Proposo fer-ne menys els dies fluixos.`
        : `${baixa.nom} baixa un ${percent(-baixa.variacio)} respecte a ${anterior[periode]}.`,
    );
  } else if (puja && puja.variacio > 0.04) {
    punts.push(`${puja.nom} puja un ${percent(puja.variacio)} respecte a ${anterior[periode]}.`);
  }

  if (d.comandes > 0) {
    punts.push(
      d.ambDinar > dinarAnterior + 0.01
        ? `El Dinar ha pujat del ${percent(dinarAnterior)} al **${percent(d.ambDinar)}** des que surt a la fitxa del plat.`
        : `El Dinar és al ${percent(d.ambDinar)} de les comandes (${percent(dinarAnterior)} ${anterior[periode]}).`,
    );
  }

  const top = plats[0];
  const titol = !top
    ? "Encara no hi ha prou comandes per dir res"
    : baixa && baixa.variacio < -0.04 && baixa.nom !== top.nom
      ? `${top.nom} tira del carro, ${baixa.nom} s'apaga`
      : `${top.nom} tira del carro`;
  return { titol, punts: punts.length ? punts : ["Encara no hi ha comandes en aquest període."] };
}

const nomsDies = ["", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"];
const llista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} i ${xs.at(-1)}`);

export function franges(fluixes: { dow: number; slot: string }[], mitjanaFluixes: number, mitjanaMigdia: number, prova: number | null) {
  const dies = [...new Set(fluixes.map((f) => f.dow))].sort().map((d) => nomsDies[d]);
  const hores = fluixes.flatMap((f) => f.slot.split("-").map(Number));
  const tram = hores.length ? `de ${Math.min(...hores)} a ${Math.max(...hores)} h` : "";
  return {
    titol: fluixes.length ? `Segell doble ${llista(dies)} ${tram}` : "Encara no hi ha franges fluixes",
    punts: [
      `Són les quatre franges més fluixes: **${mitjanaFluixes} comandes** de mitjana, quan el migdia en fa ${mitjanaMigdia}.`,
      prova == null
        ? "Encara no has provat el segell doble en cap franja: seria la primera prova."
        : `Quan vas provar el segell doble els dilluns al vespre: **${percent(prova, { signe: true })}**.`,
      "Costa una paraula extra al carnet, no un descompte. El preu no es toca.",
    ],
    nota: "**De 15 a 16 h també és fluix**, però és l'hora del Què Queda: no ho toco.",
  };
}

type Proposta = { titol: string; punts: string[]; accio: string } | null;

export function clients(tots: (Client & { laborables: number; tarda: number; wallet: boolean })[], _totalComandes90: number): Record<Segment, Proposta> {
  const de = (s: Segment) => tots.filter((c) => c.segments.includes(s));
  const risc = de("risc");
  const nous = de("nous");
  const adormits = de("adormits");

  const oficina = risc.filter((c) => c.comandes && c.laborables / c.comandes >= 0.5).length;
  const freds = risc.filter((c) => c.platPreferit === "L'Esqueixat").length;
  const aProp = risc.filter((c) => 8 - c.paraules <= 3).length;

  return {
    tots: null,
    risc: risc.length
      ? {
          titol: oficina > risc.length / 2 ? "Són gent d'oficina que ha canviat de rutina" : "Habituals que s'han despistat",
          punts: [
            `${oficina} de ${risc.length} demanaven al migdia, de dimarts a dijous. Treballen al 22@.`,
            freds
              ? `${freds} tenien L'Esqueixat de preferit i van baixar quan vam passar a la carta de tardor.`
              : `Fa ${Math.round(risc.reduce((s, c) => s + c.senseVenir, 0) / risc.length)} dies de mitjana que no demanen.`,
            `${aProp} estan a 3 paraules o menys de completar el carnet.`,
          ],
          accio: "Crea una campanya per a ells",
        }
      : null,
    nous: nous.length
      ? {
          titol: "Arriben pel carnet i tornen aviat",
          punts: [
            `${nous.length} persones s'han donat d'alta els últims 30 dies.`,
            `${nous.filter((c) => c.comandes >= 2).length} ja han tornat a demanar després de la primera comanda.`,
            `${nous.filter((c) => c.platPreferit === "Fricandó amb Bolets" || c.platPreferit === "La Castanyera").length} tenen un plat de tardor de preferit.`,
          ],
          accio: "Prepara una benvinguda",
        }
      : null,
    adormits: adormits.length
      ? {
          titol: "Fa més d'un mes i mig que no els veiem",
          punts: [
            `${adormits.filter((c) => c.comandes <= 2).length} de ${adormits.length} només van fer una o dues comandes.`,
            `Només ${adormits.filter((c) => c.wallet).length} tenen el carnet al wallet; la resta només es poden avisar per correu.`,
            `${adormits.filter((c) => c.platPreferit === "L'Esqueixat").length} tenien un plat fred de preferit.`,
          ],
          accio: "Crea una campanya per a ells",
        }
      : null,
  };
}
