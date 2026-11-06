// Contingut de la web pública que no és a la base de dades: fotos, textos llargs de les fitxes i el padró il·lustrat.
// Els preus, la disponibilitat i els al·lèrgens surten de la carta (taula `dishes`).

import type { Idioma, Plat } from "@/lib/data/carta";
import { fitxesIdiomes, padroIdiomes } from "./contingut-idiomes";

/** El que la web necessita d'un plat: la carta més la foto i els textos. Serialitzable per als components de client. */
export interface PlatWeb {
  slug: string;
  nom: string;
  seccio: Plat["seccio"];
  preu: number;
  disponible: boolean;
  etiquetes: string[];
  alergens: string[];
  imatge?: string;
  lema?: string;
  resum: string;
}

export function platWeb(p: Plat, idioma: Idioma = "ca"): PlatWeb {
  const f = fitxa(p.slug, idioma);
  return {
    slug: p.slug,
    nom: p.nom,
    seccio: p.seccio,
    preu: p.preu,
    disponible: p.disponible,
    etiquetes: p.etiquetes,
    alergens: p.alergens,
    imatge: f?.imatge,
    lema: f?.lema,
    resum: f?.resum ?? (p.descripcio[idioma] || p.descripcio.ca),
  };
}

/** Les carmanyoles de la casa, primer les de temporada. */
export function carmanyoles(carta: Plat[], idioma: Idioma = "ca"): PlatWeb[] {
  return carta
    .filter((p) => p.seccio === "casa")
    .sort((a, b) => Number(b.temporada !== "tot l'any") - Number(a.temporada !== "tot l'any"))
    .map((p) => platWeb(p, idioma));
}

export interface FitxaWeb {
  imatge: string;
  /** Etiqueta curta de la targeta: "Tardor", "Plat fred"… */
  lema?: string;
  /** Una línia per a la carta. */
  resum: string;
  /** Paràgraf de la fitxa. */
  descripcio: string;
  zones: { gran: string; petita: string };
  nota: string;
  empadronats: { nom: string; comarca: string }[];
  notaAlergens?: string;
}

export const fitxes: Record<string, FitxaWeb> = {
  "fricando-amb-bolets": {
    imatge: "/web/plats/fricando-amb-bolets.webp",
    lema: "Tardor",
    resum: "Vedella a xup-xup, bolets, moniato i arròs.",
    descripcio:
      "Vedella a xup-xup tres hores amb moixernons i bolets del Solsonès saltejats avui. Amb moniato rostit i arròs del Delta.",
    zones: { gran: "Fricandó amb el seu suc, bolets i moniato", petita: "Arròs del Delta" },
    nota: "A part, la picada en sobre. Sense salsa: el suc del guisat és el plat.",
    empadronats: [
      { nom: "Bolets", comarca: "Solsonès" },
      { nom: "Moniato", comarca: "Baix Llobregat" },
    ],
    notaAlergens: "Sense la picada, no porta fruits de closca.",
  },
  "la-castanyera": {
    imatge: "/web/plats/la-castanyera.webp",
    lema: "Tardor · vegetarià",
    resum: "Moniato, castanyes, bolets i formatge de cabra.",
    descripcio:
      "Moniato rostit amb castanyes del Montseny, bolets saltejats i formatge de cabra. Amb un toc de mel i romaní.",
    zones: { gran: "Moniato, castanyes i bolets", petita: "Formatge de cabra" },
    nota: "A part, la picada en sobre i la vinagreta de mel.",
    empadronats: [
      { nom: "Castanyes", comarca: "Montseny" },
      { nom: "Moniato", comarca: "Baix Llobregat" },
      { nom: "Bolets", comarca: "Solsonès" },
    ],
  },
  "la-de-sempre": {
    imatge: "/web/plats/la-de-sempre.webp",
    lema: "La més contundent",
    resum: "Botifarra torrada amb mongetes de Santa Pau.",
    descripcio: "Botifarra torrada a la planxa amb mongetes de Santa Pau saltejades amb all i julivert.",
    zones: { gran: "Botifarra torrada", petita: "Mongetes de Santa Pau" },
    nota: "A part, l'allioli. Com sempre.",
    empadronats: [],
  },
  "pollastre-de-diumenge": {
    imatge: "/web/plats/pollastre-de-diumenge.webp",
    lema: "De diumenge, cada dia",
    resum: "Pollastre de pagès, prunes, pinyons i arròs.",
    descripcio: "Pollastre de pagès rostit a poc a poc amb prunes i pinyons, com el de l'àvia. Amb arròs blanc.",
    zones: { gran: "Pollastre amb prunes i pinyons", petita: "Arròs blanc" },
    nota: "El suc del rostit, a part, perquè l'arròs no s'estovi.",
    empadronats: [],
  },
  "l-esqueixat": {
    imatge: "/web/plats/l-esqueixat.webp",
    lema: "Plat fred",
    resum: "Bacallà esqueixat, mongetes i olives negres.",
    descripcio: "Bacallà esqueixat a mà amb tomàquet, ceba, pebrot, olives negres i mongetes del ganxet.",
    zones: { gran: "Esqueixada de bacallà", petita: "Mongetes del ganxet" },
    nota: "A part, la vinagreta. Es menja fred.",
    empadronats: [],
  },
  "tot-escalivat": {
    imatge: "/web/plats/tot-escalivat.webp",
    lema: "Vegà",
    resum: "Escalivada, cigrons d'Oristà i olives.",
    descripcio: "Albergínia, pebrot i ceba escalivats a la brasa, amb cigrons d'Oristà i olives arbequines.",
    zones: { gran: "Escalivada", petita: "Cigrons d'Oristà" },
    nota: "A part, el romesco. Si el vols amb anxoves, demana-ho.",
    empadronats: [],
  },
  "fes-te-l-tu": {
    // No té fitxa: es tria en un popup des de la carta i des de l'inici.
    imatge: "/web/plats/tot-escalivat.webp",
    resum: "Un principal, una base i tres complements. La picada, inclosa.",
    descripcio: "Tria un principal, una base (arròs, cigrons o fesols) i tres complements. La picada hi és inclosa.",
    zones: { gran: "El principal i els complements", petita: "La base" },
    nota: "",
    empadronats: [],
  },
  "crema-catalana": {
    imatge: "/web/plats/crema-catalana.webp",
    resum: "El cremat, a part.",
    descripcio: "Crema catalana feta cada matí. El sucre el cremem en recollir-la.",
    zones: { gran: "Crema", petita: "Sucre per cremar" },
    nota: "",
    empadronats: [],
  },
};

/** Les opcions d'El Dinar que ensenya la fitxa. */
export const opcionsDinar = ["beguda-de-temporada", "crema-catalana"];

export interface CartaPadro {
  ingredient: string;
  origen: string;
  fins: string;
  cita: string;
  qui: string;
  /** Text alternatiu de la foto. */
  foto: string;
  imatge: string;
  /** Foto del producte, a la targeta de l'ingredient. */
  producte: string;
}

export const padroTardor: CartaPadro[] = [
  {
    ingredient: "Bolets",
    origen: "Solsonès · collits a mà",
    fins: "Empadronats fins al desembre",
    cita: "«El bolet no es cultiva: es busca.»",
    qui: "Montse, boletaire del Solsonès",
    foto: "la Montse al bosc",
    imatge: "/web/productors/bolets.webp",
    producte: "/web/producte/bolets.webp",
  },
  {
    ingredient: "Castanyes",
    origen: "Montseny · de castanyer vell",
    fins: "Empadronades fins al novembre",
    cita: "«Quan cauen soles, és que són a punt.»",
    qui: "Ramon, castanyer del Montseny",
    foto: "el Ramon sota el castanyer",
    imatge: "/web/productors/castanyes.webp",
    producte: "/web/producte/castanyes.webp",
  },
  {
    ingredient: "Moniato",
    origen: "Baix Llobregat · terra del delta",
    fins: "Empadronat fins al gener",
    cita: "«Del camp a la teva carmanyola hi ha quinze quilòmetres.»",
    qui: "Pau, pagès del delta",
    foto: "el Pau al camp",
    imatge: "/web/productors/moniato.webp",
    producte: "/web/producte/moniato.webp",
  },
  {
    ingredient: "Codony",
    origen: "Segrià · per a l’allioli de codony",
    fins: "Empadronat fins al desembre",
    cita: "«El codony fa olor de tardor tot l’any.»",
    qui: "Núria, de l’horta del Segrià",
    foto: "la Núria a l’horta",
    imatge: "/web/productors/codony.webp",
    producte: "/web/producte/codony.webp",
  },
];

/** Operació Desbowlitzar: la paraula importada i la d'aquí. */
export const desbowlitza: [string, string][] = [
  ["bowl", "carmanyola"],
  ["topping", "picada"],
  ["takeaway", "per emportar"],
  ["brunch", "esmorzar de forquilla"],
];

/** La fitxa en l'idioma de la visita (el que no està traduït, en català). */
export function fitxa(slug: string, idioma: Idioma = "ca"): FitxaWeb | undefined {
  const f = fitxes[slug];
  if (!f || idioma === "ca") return f;
  const tr = fitxesIdiomes[idioma][slug];
  if (!tr) return f;
  const { empadronats, ...textos } = tr;
  return {
    ...f,
    ...textos,
    empadronats: f.empadronats.map((e, i) => ({ ...e, nom: empadronats?.[i] ?? e.nom })),
  };
}

/** El padró il·lustrat en l'idioma de la visita. */
export function padro(idioma: Idioma = "ca"): CartaPadro[] {
  if (idioma === "ca") return padroTardor;
  return padroTardor.map((p, i) => ({ ...p, ...padroIdiomes[idioma][i] }));
}
