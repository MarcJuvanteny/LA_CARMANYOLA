/**
 * Calendari del restaurant: obert o tancat, servei i franges de 15 minuts.
 * Tota la lògica en hora de Barcelona (Europe/Madrid), també amb el canvi d'horari.
 */

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { SERVICES, SLOT_MINUTES, TZ, type Servei } from "./config";

export interface Slot {
  /** Inici de la franja (UTC). */
  start: Date;
  /** Data local (YYYY-MM-DD). */
  day: string;
  service: Servei;
  /** Posició dins del servei (0 = primera franja). */
  index: number;
}

/** Data local de Barcelona d'un instant. */
export const diaLocal = (d: Date) => formatInTimeZone(d, TZ, "yyyy-MM-dd");

/** Hora local "HH:mm". */
export const horaLocal = (d: Date) => formatInTimeZone(d, TZ, "HH:mm");

/** Dia ISO de la setmana (1 = dilluns … 7 = diumenge). */
export function isoDow(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay() || 7;
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const diesEntre = (a: string, b: string) =>
  Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);

/** Hora local d'un dia → instant UTC. */
export const momentLocal = (day: string, hhmm: string) => fromZonedTime(`${day}T${hhmm}:00`, TZ);

/** Diumenge i festius de Barcelona, tancat. */
export function obert(day: string, festius: ReadonlySet<string>): boolean {
  return isoDow(day) !== 7 && !festius.has(day);
}

function minuts(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Franges d'un servei (sense comprovar si el dia és obert). */
export function frangesServei(day: string, service: Servei): Slot[] {
  const { start, end } = SERVICES[service];
  const out: Slot[] = [];
  for (let m = minuts(start), i = 0; m < minuts(end); m += SLOT_MINUTES, i++) {
    out.push({ start: momentLocal(day, hhmm(m)), day, service, index: i });
  }
  return out;
}

/** Franges d'un dia obert (buit si és diumenge o festiu). */
export function frangesDia(day: string, festius: ReadonlySet<string>): Slot[] {
  if (!obert(day, festius)) return [];
  return [...frangesServei(day, "dinar"), ...frangesServei(day, "sopar")];
}

export const fiFranja = (s: Slot) => new Date(s.start.getTime() + SLOT_MINUTES * 60000);

/**
 * Franges que comencen després de `desDe` (exclòs) i que ja han acabat a `finsA`.
 * Una franja només es simula quan ja ha passat.
 */
export function frangesEntre(desDe: Date, finsA: Date, festius: ReadonlySet<string>): Slot[] {
  const out: Slot[] = [];
  for (let day = diaLocal(desDe); day <= diaLocal(finsA); day = addDays(day, 1)) {
    for (const s of frangesDia(day, festius)) {
      if (s.start > desDe && fiFranja(s) <= finsA) out.push(s);
    }
  }
  return out;
}

/** Servei en curs o null (fora d'horari). */
export function serveiActual(ara: Date, festius: ReadonlySet<string>): Servei | null {
  const day = diaLocal(ara);
  if (!obert(day, festius)) return null;
  const m = minuts(horaLocal(ara));
  for (const s of Object.keys(SERVICES) as Servei[]) {
    if (m >= minuts(SERVICES[s].start) && m < minuts(SERVICES[s].end)) return s;
  }
  return null;
}

/** Setmana ISO (dilluns-diumenge) que conté el 31 d'octubre. */
export function esCastanyada(day: string): boolean {
  const any = day.slice(0, 4);
  const castanyada = `${any}-10-31`;
  const dilluns = addDays(castanyada, -(isoDow(castanyada) - 1));
  return day >= dilluns && day <= addDays(dilluns, 6);
}

/** "dinar"/"sopar" del simulador → "migdia"/"vespre" de la base de dades. */
export const serveiDb = (s: Servei) => (s === "dinar" ? "migdia" : "vespre");
