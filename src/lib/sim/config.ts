/**
 * Paràmetres del simulador de La Carmanyola.
 * Totes les xifres del comportament simulat són aquí: es poden ajustar sense tocar la lògica.
 * Les dades de negoci (plats, preus, paraules, padró) NO són aquí: es llegeixen de la base de dades.
 */

export const TZ = "Europe/Madrid";

/** Dia d'obertura fictici: l'històric comença aquí (dilluns). */
export const SIM_OPENING_DATE = "2026-04-13";

/**
 * Data en què el repartiment de canals arriba al seu valor final. És fixa (no "avui")
 * perquè el resultat d'una franja no depengui del dia en què es calcula.
 */
export const SIM_CHANNEL_RAMP_END = "2026-10-24";

/**
 * Temporada de tardor. PROVISIONAL mentre el padró és en standby:
 * els plats amb season = 'tardor' només es poden demanar entre aquestes dates.
 */
export const SIM_TARDOR = { from: "2026-09-22", to: "2026-12-21" };

/** Franges de 15 minuts. */
export const SLOT_MINUTES = 15;

/** Horari (dilluns a dissabte; diumenge i festius de Barcelona, tancat). */
export const SERVICES = {
  dinar: { start: "12:30", end: "16:00" },
  sopar: { start: "19:30", end: "22:30" },
} as const;
export type Servei = keyof typeof SERVICES;

/** Comandes mitjanes per servei, abans dels factors del dia. */
export const VOLUME = {
  dinar: { entreSetmana: 70, dissabte: 35 },
  sopar: { entreSetmana: 28, dissabte: 40 },
};

/**
 * Corba de cada servei per franges de 15 minuts (pes relatiu; es normalitza).
 * Dinar: 14 franges de 12:30 a 16:00, pic entre 13:15 i 14:15.
 * Sopar: 12 franges de 19:30 a 22:30, pic entre 20:30 i 21:30.
 */
export const CURVES: Record<Servei, number[]> = {
  dinar: [0.45, 0.65, 0.95, 1.4, 1.65, 1.75, 1.6, 1.2, 0.85, 0.6, 0.45, 0.35, 0.3, 0.2],
  sopar: [0.3, 0.45, 0.7, 0.95, 1.35, 1.55, 1.55, 1.35, 0.9, 0.6, 0.4, 0.25],
};

/** Factor del dia (ISO: 1 = dilluns). */
export const DAY_FACTOR: Record<number, number> = { 1: 0.95, 2: 0.9, 3: 0.9, 4: 1.0, 5: 1.2, 6: 1.0 };

/** Al vespre, dimarts i dimecres encara més fluixos: les franges que la IA ha de trobar. */
export const EVENING_FACTOR: Record<number, number> = { 2: 0.7, 3: 0.7 };

/** Soroll del dia: cap dia és igual. Uns pocs dies són clarament atípics. */
export const DAY_NOISE = { sd: 0.08, atypicalProb: 0.03, atypicalRange: [0.65, 1.35] as [number, number] };

/** Pluja: més de 2 mm al dia. */
export const RAIN = {
  thresholdMm: 2,
  volume: 0.9,
  platform: 1.3,
  /** Multiplicador per slug de plat. */
  dishes: { "fricando-amb-bolets": 1.6, "l-esqueixat": 0.7 } as Record<string, number>,
};

/** Castanyada: la setmana (ISO) del 31 d'octubre. */
export const CASTANYADA = { factor: 1.2 /* postres i plats de tardor */ };

/** Canals: interpolació lineal entre l'obertura i SIM_CHANNEL_RAMP_END. El directe creix. */
export const CHANNELS = {
  start: { web: 0.25, local: 0.4, plataforma: 0.35 },
  end: { web: 0.4, local: 0.35, plataforma: 0.25 },
};

/** Carmanyoles per comanda (mitjana). */
export const ITEMS_PER_ORDER: Record<Servei, number> = { dinar: 1.1, sopar: 1.8 };

/** El Dinar (+2 €, beguda o postre): proporció de les comandes de dinar. */
export const DINAR_SHARE = 0.45;
export const DINAR_SUPPLEMENT_CENTS = 200;

/** Complements (secció "Per acompanyar") i postres pagades fora d'El Dinar. */
export const COMPLEMENT_SHARE = 0.2;
export const EXTRA_DESSERT_SHARE = 0.15;

/** Tot Escalivat amb anxoves (suplement de la carta), entre els que no són vegans. */
export const SUPPLEMENT_SHARE = 0.3;

/** Cancel·lacions: només comandes web. */
export const WEB_CANCELLATION = 0.015;

/** Minuts entre que es fa la comanda i l'hora de recollida. */
export const LEAD_MINUTES = { web: [10, 40], plataforma: [15, 35], local: [0, 5] } as Record<string, [number, number]>;

/** Popularitat base quan el client no tria un plat preferit (per slug). */
export const DISH_POPULARITY: Record<string, number> = {
  "la-de-sempre": 1.0,
  "pollastre-de-diumenge": 0.85,
  "l-esqueixat": 0.8,
  "tot-escalivat": 0.75,
  "fricando-amb-bolets": 1.25,
  "la-castanyera": 1.0,
  "fes-te-l-tu": 0.25,
};
/** Probabilitat que un client registrat demani un dels seus plats preferits. */
export const FAVOURITE_SHARE = 0.7;
/** Els plats freds baixen a la tardor. */
export const COLD_DISHES_AUTUMN = 0.6;

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const TOTAL_CUSTOMERS = 400;
/** Operació Desbowlitzar: part de les altes les 4 primeres setmanes; després, degoteig. */
export const LAUNCH = { weeks: 4, share: 0.35 };
/** Altes noves cada nit al restaurant viu. */
export const NIGHTLY_NEW_CUSTOMERS: [number, number] = [0, 2];

export const LOCALES = { ca: 0.7, es: 0.15, en: 0.15 };
/** Dels clients en anglès, part són internacionals (noms francesos, italians, alemanys…). */
export const INTERNATIONAL_SHARE_OF_EN = 0.4;
export const MARKETING_CONSENT = 0.6;
export const WALLET_SHARE = 0.6;
export const EMAIL_DOMAIN = "example.com";

export type Perfil = "oficinista" | "ocasional" | "vega" | "familia" | "desertor";

/** Perfils ocults (taula sim_profiles). El panell no els llegeix mai. */
export const PROFILES: Record<
  Perfil,
  { weight: number; perWeek: [number, number]; days: number[]; service: Servei; scan: number }
> = {
  oficinista: { weight: 0.4, perWeek: [1.5, 3], days: [2, 3, 4], service: "dinar", scan: 0.6 },
  ocasional: { weight: 0.3, perWeek: [0.1, 0.5], days: [1, 2, 3, 4, 5], service: "dinar", scan: 0.3 },
  vega: { weight: 0.08, perWeek: [0.8, 2], days: [1, 2, 3, 4, 5], service: "dinar", scan: 0.5 },
  familia: { weight: 0.1, perWeek: [0.5, 1], days: [6], service: "sopar", scan: 0.4 },
  desertor: { weight: 0.12, perWeek: [1.5, 2.5], days: [1, 2, 3, 4, 5], service: "dinar", scan: 0.6 },
};

/** Desertors: deixen de venir entre aquests dies després de l'alta (i com a molt fa 12 dies). */
export const CHURN = { afterDays: [45, 150] as [number, number], minDaysAgo: 12, residualRate: 0.03 };

/**
 * Els clients registrats no poden fer més comandes que la demanda directa de la franja.
 * Si els perfils en demanen més, es reescalen. Queda espai per a comandes anònimes.
 */
export const REGISTERED_CAP_OF_DIRECT = 0.8;

// ---------------------------------------------------------------------------
// Campanyes
// ---------------------------------------------------------------------------

/** Qui rep una campanya (i no és del grup de control) demana més els 14 dies següents. */
export const CAMPAIGN_BOOST = 2.3;
export const CAMPAIGN_WINDOW_DAYS = 14;
/** Un segell doble en una franja n'augmenta el volum. */
export const DOUBLE_STAMP_SLOT_BOOST = 1.15;
/** Proporció de destinataris que van al grup de control (no reben l'avís). */
export const CONTROL_SHARE = 0.25;

// ---------------------------------------------------------------------------
// Carnet (la lògica és a registra_segell(), en SQL)
// ---------------------------------------------------------------------------
// · 1 segell de regal en fer-se el carnet · 1 paraula per comanda directa (mai plataformes).
// · 8 paraules = carnet complet → "postres de regal" i comença un carnet nou. Cap altra recompensa.
// · Paraules 5-8 del diccionari: pendents (es compten com a "paraula pendent").

// ---------------------------------------------------------------------------
// Dades externes
// ---------------------------------------------------------------------------

export const WEATHER = { latitude: 41.4, longitude: 2.2 };

/**
 * Festius de Barcelona 2026.
 * Catalunya: Ordre EMT/66/2025, de 30 d'abril (DOGC núm. 9406, 6.5.2025).
 * Locals de Barcelona (Segona Pasqua i la Mercè): Ordre EMT/208/2025 (DOGC núm. 9565, 17.12.2025).
 */
export const HOLIDAYS_2026: [string, string][] = [
  ["2026-01-01", "Cap d'Any"],
  ["2026-01-06", "Reis"],
  ["2026-04-03", "Divendres Sant"],
  ["2026-04-06", "Dilluns de Pasqua"],
  ["2026-05-01", "Festa del Treball"],
  ["2026-05-25", "Segona Pasqua (festa local de Barcelona)"],
  ["2026-06-24", "Sant Joan"],
  ["2026-08-15", "L'Assumpció"],
  ["2026-09-11", "Diada Nacional de Catalunya"],
  ["2026-09-24", "La Mercè (festa local de Barcelona)"],
  ["2026-10-12", "Festa Nacional d'Espanya"],
  ["2026-12-08", "La Immaculada"],
  ["2026-12-25", "Nadal"],
  ["2026-12-26", "Sant Esteve"],
];
export const HOLIDAYS_SOURCE = "DOGC 9406 (Ordre EMT/66/2025) i DOGC 9565 (Ordre EMT/208/2025)";
