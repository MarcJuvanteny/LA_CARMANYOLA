// Veu de marca (taula `brand_voice`). És el prompt de la IA: s'edita des del panell.

import type { Idioma } from "./carta";

export interface SeccioVeu {
  id: string;
  titol: string;
  text: string;
}

export const veuInicial: SeccioVeu[] = [
  {
    id: "qui",
    titol: "Qui som",
    text: "La Carmanyola és cuina tradicional catalana per emportar al Poblenou. Servim en carmanyola: rodona, com una cassola, amb el plat a la zona gran i la guarnició a la petita. Les salses sempre van a part.",
  },
  {
    id: "to",
    titol: "Com parlem",
    text: "Proper, amb humor de veïnat. Tutegem sempre. Mai pretensiosos, nostàlgics ni sarcàstics. Frases curtes, verbs actius i un sol missatge per avís.",
  },
  {
    id: "si",
    titol: "Paraules nostres",
    text: "carmanyola, plat, guarnició, acompanyaments, picada, salsa a part, padró, empadronar-se, donar-se de baixa, Què Queda, carnet, paraula",
  },
  {
    id: "no",
    titol: "Paraules que no fem servir",
    text: "bowl, topping, base, proteïna, poke, fit, healthy, descompte, rebaixa, oferta, restes, sobres",
  },
  {
    id: "regles",
    titol: "Regles",
    text: "No ens definim contra ningú. Ni descomptes ni percentatges de rebaixa: les recompenses són producte, paraules i privilegis. Cap reclam nutricional. El Què Queda mai són restes. Els noms dels plats sempre en català.",
  },
];

/** Paraules prohibides que el codi detecta (no la IA). */
export const paraulesProhibides = [
  "bowl",
  "bowls",
  "topping",
  "toppings",
  "poke",
  "fit",
  "healthy",
  "descompte",
  "descomptes",
  "rebaixa",
  "rebaixes",
  "oferta",
  "restes",
  "sobres",
  "descuento",
  "sobras",
  "discount",
  "leftovers",
];

export type Situacio = "recuperacio" | "franja" | "queQueda" | "padro";

export const situacions: Situacio[] = ["recuperacio", "franja", "queQueda", "padro"];

/**
 * Encàrrec per a la IA a cada situació de prova: només els fets (com els donaria SQL).
 * La manera de dir-ho la posa la veu de marca.
 */
export const encarrecsVeu: Record<Situacio, string> = {
  recuperacio:
    "Avís per recuperar una clienta que fa 5 setmanes que no ve. Fets: es diu Laia; al carnet li falta la paraula «picada»; el seu plat preferit és el Fricandó amb Bolets, que és a la carta fins al desembre; aquesta setmana cada carmanyola suma doble al carnet.",
  franja:
    "Avís per omplir una franja fluixa. Fets: dimarts al vespre és la franja més tranquil·la de la setmana; de 20 a 22 h cada carmanyola suma dues paraules al carnet en comptes d'una.",
  queQueda:
    "Avís del Què Queda (l'última mitja hora del servei de migdia), només per a clients amb carnet. Fets: queden 6 Fricandó amb Bolets, 5 Tot Escalivat i 4 Pollastre de Diumenge; es poden recollir fins a les 16 h.",
  padro:
    "Avís d'alta al padró d'ingredients. Fets: la carxofa del Prat s'empadrona el 9 de novembre; ve del Baix Llobregat; es quedarà fins a la primavera.",
};

/** Respostes d'exemple: es fan servir si la IA no respon (sense clau, saturada o límit gratuït). */
export const provesVeu: Record<Situacio, Record<Idioma, string>> = {
  recuperacio: {
    ca: "Fa dies que no et veiem, Laia. Et falta la paraula «picada» i el fricandó amb bolets t'espera fins al desembre. Aquesta setmana, la carmanyola suma doble.",
    es: "Hace días que no te vemos, Laia. Te falta la palabra «picada» y el fricandó con setas te espera hasta diciembre. Esta semana, la carmanyola suma doble.",
    en: "Long time no see, Laia. You're missing the word “picada”, and the fricandó with mushrooms is here until December. This week, your carmanyola counts double.",
  },
  franja: {
    ca: "Dimarts al vespre la cuina va tranquil·la i ho celebrem: de 20 a 22 h, cada carmanyola et suma dues paraules al carnet.",
    es: "El martes por la noche la cocina va tranquila y lo celebramos: de 20 a 22 h, cada carmanyola te suma dos palabras en el carnet.",
    en: "Tuesday evenings are calm in the kitchen, so we're celebrating: from 8 to 10 pm, every carmanyola adds two words to your card.",
  },
  queQueda: {
    ca: "Què queda avui? 6 Fricandó amb Bolets, 5 Tot Escalivat i 4 Pollastre de Diumenge. Fins a les 16 h, només per als clients amb carnet. Baixa a buscar-ne un.",
    es: "¿Qué queda hoy? 6 Fricandó amb Bolets, 5 Tot Escalivat y 4 Pollastre de Diumenge. Hasta las 16 h, solo para quien tiene carnet. Baja a por uno.",
    en: "What's left today? 6 Fricandó amb Bolets, 5 Tot Escalivat and 4 Pollastre de Diumenge. Until 4 pm, for card holders only. Come down and grab one.",
  },
  padro: {
    ca: "Nova veïna al padró: la carxofa del Prat s'empadrona a partir del 9 de novembre. Ve del Baix Llobregat i es quedarà fins a la primavera.",
    es: "Nueva vecina en el padrón: la alcachofa del Prat se empadrona a partir del 9 de noviembre. Viene del Baix Llobregat y se quedará hasta la primavera.",
    en: "New neighbour on the register: the Prat artichoke moves in from 9 November. It comes from the Baix Llobregat and will stay until spring.",
  },
};
