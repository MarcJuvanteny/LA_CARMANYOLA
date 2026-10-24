// Tipus de la pantalla de Vendes. Les dades surten de la funció SQL panel_vendes (src/lib/db/panel.ts).

export type Periode = "avui" | "setmana" | "mes";

export interface PuntBarres {
  etiqueta: string;
  actual: number; // cèntims
  anterior: number; // cèntims
}

export interface VendaPlat {
  nom: string;
  unitats: number;
  ingressos: number; // cèntims
  variacio: number; // fracció vs període anterior
}

export interface DadesVendes {
  subtitol: string;
  ingressos: number;
  ingressosAnteriors: number;
  comandes: number;
  comandesAnteriors: number;
  tiquetMitja: number;
  tiquetMitjaAnterior: number;
  ambDinar: number; // fracció
  comandesDinar: number;
  extraDinar: number;
  perDia: PuntBarres[];
  titolGrafic: string;
  canal: { web: number; plataformes: number; comissions: number };
  plats: VendaPlat[];
  altres: { dinar: number; acompanyamentsBegudes: number };
  ia: { titol: string; punts: string[] };
}
