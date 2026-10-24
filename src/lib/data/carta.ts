// Carta simulada. Font de veritat: docs/CARTA.md (i, més endavant, la taula `dishes`).
// Preus en cèntims. Els noms dels plats sempre en català.

export type Idioma = "ca" | "es" | "en";
export type Seccio = "casa" | "fes" | "acompanyar" | "postres" | "begudes";
export type Temporada = "tot l'any" | "tardor";

export interface Plat {
  slug: string;
  nom: string;
  seccio: Seccio;
  preu: number;
  temporada: Temporada;
  etiquetes: string[];
  alergens: string[];
  queQuedaOk: boolean;
  disponible: boolean;
  descripcio: Record<Idioma, string>;
  suplement?: { nom: string; preu: number };
}

export const plats: Plat[] = [
  {
    slug: "la-de-sempre",
    nom: "La de Sempre",
    seccio: "casa",
    preu: 1250,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: ["sulfits"],
    queQuedaOk: true,
    disponible: true,
    descripcio: {
      ca: "Botifarra amb mongetes de Santa Pau.",
      es: "Butifarra con judías de Santa Pau.",
      en: "Catalan sausage with Santa Pau beans.",
    },
  },
  {
    slug: "pollastre-de-diumenge",
    nom: "Pollastre de Diumenge",
    seccio: "casa",
    preu: 1250,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: ["fruits de closca", "sulfits"],
    queQuedaOk: true,
    disponible: true,
    descripcio: {
      ca: "Pollastre amb prunes i pinyons.",
      es: "Pollo con ciruelas y piñones.",
      en: "Chicken with prunes and pine nuts.",
    },
  },
  {
    slug: "l-esqueixat",
    nom: "L'Esqueixat",
    seccio: "casa",
    preu: 1350,
    temporada: "tot l'any",
    etiquetes: ["fred"],
    alergens: ["peix"],
    queQuedaOk: true,
    disponible: true,
    descripcio: {
      ca: "Plat fred.",
      es: "Plato frío.",
      en: "Served cold.",
    },
  },
  {
    slug: "tot-escalivat",
    nom: "Tot Escalivat",
    seccio: "casa",
    preu: 1190,
    temporada: "tot l'any",
    etiquetes: ["vegà"],
    alergens: [],
    queQuedaOk: true,
    disponible: true,
    descripcio: {
      ca: "Vegà. Si el vols amb anxoves, demana-ho.",
      es: "Vegano. Si lo quieres con anchoas, pídelo.",
      en: "Vegan. Ask for anchovies if you fancy them.",
    },
    suplement: { nom: "Amb anxoves", preu: 200 },
  },
  {
    slug: "fricando-amb-bolets",
    nom: "Fricandó amb Bolets",
    seccio: "casa",
    preu: 1390,
    temporada: "tardor",
    etiquetes: [],
    alergens: ["gluten", "fruits de closca"],
    queQuedaOk: true,
    disponible: true,
    descripcio: {
      ca: "El fricandó de tota la vida, amb bolets del Solsonès.",
      es: "El fricandó de toda la vida, con setas del Solsonès.",
      en: "Classic fricandó stew with mushrooms from the Solsonès.",
    },
  },
  {
    slug: "la-castanyera",
    nom: "La Castanyera",
    seccio: "casa",
    preu: 1290,
    temporada: "tardor",
    etiquetes: ["vegetarià"],
    alergens: ["llet"],
    queQuedaOk: true,
    disponible: true,
    descripcio: {
      ca: "Vegetariana, amb castanyes del Montseny i moniato.",
      es: "Vegetariana, con castañas del Montseny y boniato.",
      en: "Vegetarian, with Montseny chestnuts and sweet potato.",
    },
  },
  {
    slug: "fes-te-l-tu",
    nom: "Fes-te'l tu",
    seccio: "fes",
    preu: 1190,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: ["gluten", "fruits de closca"],
    queQuedaOk: false,
    disponible: true,
    descripcio: {
      ca: "Plat, guarnició, 2 acompanyaments i salsa a part. La picada hi és inclosa.",
      es: "Plato, guarnición, 2 acompañamientos y salsa aparte. La picada va incluida.",
      en: "Main, side, 2 extras and sauce on the side. Picada included.",
    },
  },
  {
    slug: "coca-de-recapte",
    nom: "Coca de recapte",
    seccio: "acompanyar",
    preu: 450,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: ["gluten"],
    queQuedaOk: false,
    disponible: true,
    descripcio: { ca: "", es: "", en: "" },
  },
  {
    slug: "pa-amb-tomaquet",
    nom: "Pa amb tomàquet per muntar",
    seccio: "acompanyar",
    preu: 350,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: ["gluten"],
    queQuedaOk: false,
    disponible: true,
    descripcio: { ca: "", es: "", en: "" },
  },
  {
    slug: "olives-i-encurtits",
    nom: "Olives i encurtits",
    seccio: "acompanyar",
    preu: 350,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: ["sulfits"],
    queQuedaOk: false,
    disponible: true,
    descripcio: { ca: "", es: "", en: "" },
  },
  {
    slug: "crema-catalana",
    nom: "Crema catalana",
    seccio: "postres",
    preu: 450,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: ["llet", "ou"],
    queQuedaOk: false,
    disponible: true,
    descripcio: { ca: "", es: "", en: "" },
  },
  {
    slug: "pa-amb-xocolata",
    nom: "Pa amb tomàquet i xocolata",
    seccio: "postres",
    preu: 450,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: ["gluten", "llet"],
    queQuedaOk: false,
    disponible: true,
    descripcio: { ca: "", es: "", en: "" },
  },
  {
    slug: "mel-i-mato",
    nom: "Mel i mató",
    seccio: "postres",
    preu: 450,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: ["llet"],
    queQuedaOk: false,
    disponible: true,
    descripcio: { ca: "", es: "", en: "" },
  },
  {
    slug: "llimonada-de-marialluisa",
    nom: "Llimonada de marialluïsa",
    seccio: "begudes",
    preu: 290,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: [],
    queQuedaOk: false,
    disponible: true,
    descripcio: { ca: "", es: "", en: "" },
  },
  {
    slug: "vermut-sense-alcohol",
    nom: "Vermut sense alcohol",
    seccio: "begudes",
    preu: 320,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: ["sulfits"],
    queQuedaOk: false,
    disponible: true,
    descripcio: { ca: "", es: "", en: "" },
  },
  {
    slug: "beguda-de-temporada",
    nom: "Beguda de temporada",
    seccio: "begudes",
    preu: 320,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: [],
    queQuedaOk: false,
    disponible: true,
    descripcio: { ca: "", es: "", en: "" },
  },
  {
    slug: "aigua",
    nom: "Aigua",
    seccio: "begudes",
    preu: 180,
    temporada: "tot l'any",
    etiquetes: [],
    alergens: [],
    queQuedaOk: false,
    disponible: true,
    descripcio: { ca: "", es: "", en: "" },
  },
];

/** El Dinar: qualsevol carmanyola + beguda o postre. */
export const SUPLEMENT_DINAR = 200;

export const seccions: Seccio[] = ["casa", "fes", "acompanyar", "postres", "begudes"];
