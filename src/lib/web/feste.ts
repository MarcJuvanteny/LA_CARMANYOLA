// El Fes-te'l tu: un principal, una base (arròs, cigrons o fesols) i tres complements. La picada, inclosa.
// La carmanyola té el mateix espai sempre: el preu és el de la carta, més el suplement dels ingredients cars.

export type Grup = "principal" | "base" | "complement";

export interface Ingredient {
  id: string;
  nom: string;
  grup: Grup;
  /** Cèntims de més sobre el preu de la carta */
  suplement?: number;
  tardor?: boolean;
  alergens?: string[];
}

export const ingredients: Ingredient[] = [
  { id: "botifarra", nom: "Botifarra esmicolada", grup: "principal" },
  { id: "pollastre", nom: "Pollastre rostit", grup: "principal" },
  { id: "bacalla", nom: "Bacallà esqueixat", grup: "principal", suplement: 150, alergens: ["peix"] },
  { id: "escalivada", nom: "Escalivada", grup: "principal" },
  { id: "fricando", nom: "Fricandó", grup: "principal", suplement: 200, tardor: true, alergens: ["gluten", "sulfits"] },
  { id: "bolets-moniato", nom: "Bolets i moniato", grup: "principal", tardor: true },

  { id: "arros", nom: "Arròs", grup: "base" },
  { id: "cigrons", nom: "Cigrons", grup: "base" },
  { id: "fesols", nom: "Fesols", grup: "base" },

  { id: "pebrot", nom: "Pebrot escalivat", grup: "complement" },
  { id: "alberginia", nom: "Albergínia escalivada", grup: "complement" },
  { id: "ceba", nom: "Ceba encurtida", grup: "complement" },
  { id: "olives", nom: "Olives arbequines", grup: "complement" },
  { id: "prunes", nom: "Prunes i pinyons", grup: "complement", alergens: ["fruits de closca"] },
  { id: "formatge", nom: "Formatge de cabra", grup: "complement", suplement: 100, alergens: ["llet"] },
  { id: "anxoves", nom: "Anxoves de l'Escala", grup: "complement", suplement: 200, alergens: ["peix"] },
  { id: "moniato", nom: "Moniato rostit", grup: "complement", tardor: true },
  { id: "castanyes", nom: "Castanyes", grup: "complement", tardor: true },
];

/** Quants se n'han de triar de cada grup */
export const quants: Record<Grup, number> = { principal: 1, base: 1, complement: 3 };

export const grups = Object.keys(quants) as Grup[];

const PICADA_ALERGENS = ["gluten", "fruits de closca"];

const triats = (ids: string[]) => ingredients.filter((i) => ids.includes(i.id));

export const deGrup = (ids: string[], grup: Grup) => triats(ids).filter((i) => i.grup === grup);

export const preuFeste = (base: number, ids: string[]) => base + triats(ids).reduce((s, i) => s + (i.suplement ?? 0), 0);

export const alergensFeste = (ids: string[]) => [...new Set([...triats(ids).flatMap((i) => i.alergens ?? []), ...PICADA_ALERGENS])];

/** "Pollastre rostit · Arròs · Pebrot escalivat, Olives arbequines, Castanyes": el que llegeix la cuina */
export const detallFeste = (ids: string[]) =>
  grups
    .map((g) =>
      deGrup(ids, g)
        .map((i) => i.nom)
        .join(", "),
    )
    .filter(Boolean)
    .join(" · ");
