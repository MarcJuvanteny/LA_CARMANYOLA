// Tipus del padró d'ingredients (taules `ingredients` i `ingredient_alerts`).

export type EstatPadro = "empadronat" | "alta-proposada" | "baixa-proposada" | "ve-aviat" | "de-baixa";
export type Estacio = "tardor" | "hivern" | "primavera" | "estiu";

export interface Ingredient {
  id: string;
  nom: string;
  comarca: string | null;
  estacio: Estacio;
  estat: EstatPadro;
  alta: string | null;
  baixa: string | null;
  plats: string[];
}

/** Estació astronòmica d'una data (hemisferi nord). */
export function estacioDe(d = new Date()): Estacio {
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  if (md >= 1221 || md < 320) return "hivern";
  if (md < 621) return "primavera";
  if (md < 922) return "estiu";
  return "tardor";
}

export interface AvisPadro {
  id: string;
  ingredient: string;
  tipus: "alta" | "baixa";
  titol: string;
  punts: string[];
  anunci: string;
  campanya?: string;
}
