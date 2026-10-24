// Tipus de la pantalla de Clients. Les dades surten de la funció SQL panel_clients.

export type Segment = "tots" | "risc" | "nous" | "mestres" | "adormits";
export type Avisos = "carnet-correu" | "carnet" | "correu";

/** Diccionari conegut. Les altres 4 paraules estan pendents. */
export const paraulesConegudes = ["carmanyola", "picada", "per emportar", "esmorzar de forquilla"];
export const PARAULES_CARNET = 8;

export interface Client {
  id: string;
  nom: string;
  nivell: string;
  venia: string;
  senseVenir: number; // dies
  paraules: number; // de 8
  platPreferit: string;
  risc: number; // 0-100
  comandes: number;
  mesos: number;
  ultima: string;
  liFalta: string;
  avisos: Avisos;
  segments: Segment[];
}
