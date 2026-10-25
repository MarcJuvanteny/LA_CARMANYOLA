// Tipus de la pantalla de Clients. Les dades surten de la funció SQL panel_clients.

export type Segment = "tots" | "risc" | "nous" | "adormits";
export type Avisos = "carnet-correu" | "carnet" | "correu";

/** Diccionari conegut. Les altres 4 paraules estan pendents. */
export const paraulesConegudes = ["carmanyola", "picada", "per emportar", "esmorzar de forquilla"];
export const PARAULES_CARNET = 8;

export interface Client {
  id: string;
  nom: string;
  venia: string;
  senseVenir: number; // dies
  paraules: number; // del carnet en curs, de 8
  carnets: number; // carnets completats
  platPreferit: string;
  risc: number; // 0-100
  comandes: number;
  mesos: number;
  ultima: string;
  liFalta: string;
  avisos: Avisos;
  segments: Segment[];
}
