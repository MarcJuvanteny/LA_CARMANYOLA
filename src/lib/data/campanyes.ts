// Campanyes simulades (taula `campaigns`). Segments i resultats surten de SQL;
// el missatge i el raonament els redacta la IA. L'amo sempre aprova.

import type { Idioma } from "./carta";

export type TipusCampanya = "recuperacio" | "franja" | "padro" | "calendari";
export type EstatCampanya = "esborrany" | "aprovada" | "enviada" | "descartada";
export type To = "original" | "curt" | "calid" | "senseExtra";

export interface Campanya {
  id: string;
  tipus: TipusCampanya;
  titol: string;
  estat: EstatCampanya;
  proposada: string;
  xips: string[];
  perQue: string[];
  /** Missatges per to i idioma. {nom} i {paraula} són variables. */
  missatges: Record<To, Record<Idioma, string>>;
  /** Etiqueta del botó de to "sense…", si n'hi ha. */
  senseExtra?: string;
  canals: { wallet: boolean; correu: boolean; correuAcceptat: number };
  quan: { text: string; motiu: string };
  previsualitzacio: { data: string; hora: string };
  resultat?: { clients: number; tornat: number; control: number };
}

const recuperacio: Campanya["missatges"] = {
  original: {
    ca: "Fa dies que no et veiem, {nom}. Et falta recuperar la paraula «{paraula}», i el fricandó amb bolets només està empadronat fins al desembre. La propera carmanyola te la torna.",
    es: "Hace días que no te vemos, {nom}. Te falta recuperar la palabra «{paraula}», y el fricandó con setas solo está empadronado hasta diciembre. La próxima carmanyola te la devuelve.",
    en: "We haven't seen you in a while, {nom}. You still need to win back the word “{paraula}”, and the fricandó with mushrooms is only registered until December. Your next carmanyola brings it back.",
  },
  curt: {
    ca: "Fa dies que no et veiem, {nom}. Et falta la paraula «{paraula}»: la propera carmanyola te la torna.",
    es: "Hace días que no te vemos, {nom}. Te falta la palabra «{paraula}»: la próxima carmanyola te la devuelve.",
    en: "Long time no see, {nom}. You're missing “{paraula}”: your next carmanyola brings it back.",
  },
  calid: {
    ca: "{nom}, al barri se't troba a faltar! Encara tens pendent la paraula «{paraula}» i el fricandó amb bolets t'espera fins al desembre. Vine a buscar-la, que et guardem el lloc.",
    es: "{nom}, ¡en el barrio se te echa de menos! Aún tienes pendiente la palabra «{paraula}» y el fricandó con setas te espera hasta diciembre. Ven a buscarla, que te guardamos el sitio.",
    en: "{nom}, the neighbourhood misses you! You've still got “{paraula}” to win back, and the fricandó with mushrooms is waiting until December. Come and get it, we're saving you a spot.",
  },
  senseExtra: {
    ca: "Fa dies que no et veiem, {nom}. Et falta recuperar la paraula «{paraula}»: la propera carmanyola te la torna.",
    es: "Hace días que no te vemos, {nom}. Te falta recuperar la palabra «{paraula}»: la próxima carmanyola te la devuelve.",
    en: "We haven't seen you in a while, {nom}. You still need to win back the word “{paraula}”: your next carmanyola brings it back.",
  },
};

const padro: Campanya["missatges"] = {
  original: {
    ca: "{nom}, la carxofa del Prat s'empadrona a La Carmanyola. Arriba amb les primeres de la temporada i es quedarà fins a la primavera.",
    es: "{nom}, la alcachofa del Prat se empadrona en La Carmanyola. Llega con las primeras de la temporada y se quedará hasta la primavera.",
    en: "{nom}, the Prat artichoke is moving in at La Carmanyola. It arrives with the first of the season and stays until spring.",
  },
  curt: {
    ca: "{nom}, nova veïna al padró: la carxofa del Prat.",
    es: "{nom}, nueva vecina en el padrón: la alcachofa del Prat.",
    en: "{nom}, new neighbour on the register: the Prat artichoke.",
  },
  calid: {
    ca: "{nom}, tenim veïna nova! La carxofa del Prat s'empadrona avui i ve amb ganes de quedar-se fins a la primavera. Passa a saludar-la.",
    es: "{nom}, ¡tenemos vecina nueva! La alcachofa del Prat se empadrona hoy y viene con ganas de quedarse hasta la primavera. Pasa a saludarla.",
    en: "{nom}, we have a new neighbour! The Prat artichoke registers today and plans to stay until spring. Come and say hello.",
  },
  senseExtra: {
    ca: "{nom}, la carxofa del Prat arriba a La Carmanyola.",
    es: "{nom}, la alcachofa del Prat llega a La Carmanyola.",
    en: "{nom}, the Prat artichoke arrives at La Carmanyola.",
  },
};

export const campanyes: Campanya[] = [
  {
    id: "recupera-23",
    tipus: "recuperacio",
    titol: "Recupera 23 habituals",
    estat: "esborrany",
    proposada: "Proposada avui a les 6:00",
    xips: ["23 clients", "Venien 1-2 cops per setmana", "Més de 14 dies sense venir", "19 amb el carnet a mig fer"],
    perQue: [
      "Són el 6 % dels clients però feien el **14 % de les comandes**. Perdre'ls costa uns 640 € al mes.",
      "A 19 dels 23 els falten 3 paraules o menys per completar el carnet. És el millor ganxo: no cal cap descompte.",
      "Al setembre, un avís semblant va fer tornar el **35 %** en 14 dies. Sense avís, només torna el 9 %.",
    ],
    missatges: recuperacio,
    senseExtra: "Sense esmentar el padró",
    canals: { wallet: true, correu: true, correuAcceptat: 17 },
    quan: { text: "Dijous a les 11:30.", motiu: "És quan aquest grup sol decidir on dina." },
    previsualitzacio: { data: "dijous 15 d'octubre", hora: "11:30" },
  },
  {
    id: "carxofa",
    tipus: "padro",
    titol: "La carxofa del Prat arriba",
    estat: "esborrany",
    proposada: "Proposada ahir",
    xips: ["210 clients", "Van obrir l'avís dels bolets", "Alta al padró"],
    perQue: [
      "L'avís dels bolets empadronats va fer tornar el **24 %** en 14 dies.",
      "Els 210 que el van obrir són el públic natural d'un ingredient nou.",
      "No hi ha cap promoció: l'alta al padró ja és la notícia.",
    ],
    missatges: padro,
    canals: { wallet: true, correu: true, correuAcceptat: 96 },
    quan: { text: "El dia de l'alta, a les 10:00.", motiu: "Abans que es decideixi el dinar." },
    previsualitzacio: { data: "dilluns 9 de novembre", hora: "10:00" },
  },
  {
    id: "castanyada",
    tipus: "calendari",
    titol: "Castanyada",
    estat: "enviada",
    proposada: "Enviada la Castanyada passada",
    xips: ["298 clients", "Calendari"],
    perQue: [],
    missatges: recuperacio,
    canals: { wallet: true, correu: true, correuAcceptat: 188 },
    quan: { text: "", motiu: "" },
    previsualitzacio: { data: "", hora: "" },
    resultat: { clients: 298, tornat: 0.31, control: 0.11 },
  },
  {
    id: "recuperacio-setembre",
    tipus: "recuperacio",
    titol: "Recuperació de setembre",
    estat: "enviada",
    proposada: "Enviada el 17 de setembre",
    xips: ["31 clients"],
    perQue: [],
    missatges: recuperacio,
    canals: { wallet: true, correu: true, correuAcceptat: 22 },
    quan: { text: "", motiu: "" },
    previsualitzacio: { data: "", hora: "" },
    resultat: { clients: 31, tornat: 0.35, control: 0.09 },
  },
  {
    id: "bolets",
    tipus: "padro",
    titol: "Bolets empadronats",
    estat: "enviada",
    proposada: "Enviada el 2 d'octubre",
    xips: ["210 clients"],
    perQue: [],
    missatges: padro,
    canals: { wallet: true, correu: true, correuAcceptat: 131 },
    quan: { text: "", motiu: "" },
    previsualitzacio: { data: "", hora: "" },
    resultat: { clients: 210, tornat: 0.24, control: 0.1 },
  },
];

/** Exemple per a la previsualització del telèfon. */
export const exemplePrevisualitzacio = { nom: "Laia", paraula: "picada" };
