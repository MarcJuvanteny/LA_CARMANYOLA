// Dates sempre en hora de Barcelona i deterministes (servidor = navegador).
// Català per defecte; el panell les demana en el seu idioma (ca, es, en).

import type { Locale } from "@/i18n/idiomes";

const TZ = "Europe/Madrid";

const NOMS: Record<Locale, { mesos: string[]; dies: string[]; curts: string[] }> = {
  ca: {
    mesos: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"],
    dies: ["diumenge", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"],
    curts: ["Dg", "Dl", "Dt", "Dc", "Dj", "Dv", "Ds"],
  },
  es: {
    mesos: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    dies: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    curts: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"],
  },
  en: {
    mesos: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    dies: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    curts: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
};

export const mesos = NOMS.ca.mesos;
export const diesSetmana = NOMS.ca.dies;
export const diesCurts = NOMS.ca.curts;

/** Noms de mesos i dies (0 = diumenge) en l'idioma demanat. */
export const nomsMesos = (l: Locale = "ca") => NOMS[l].mesos;
export const nomsDies = (l: Locale = "ca") => NOMS[l].dies;
export const nomsDiesCurts = (l: Locale = "ca") => NOMS[l].curts;

/** Parts de la data en hora local de Barcelona. */
export function local(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return {
    any: Number(parts.year),
    mes: Number(parts.month) - 1,
    dia: Number(parts.day),
    hora: Number(parts.hour),
    minut: Number(parts.minute),
    diaSetmana: wd,
  };
}

/** "d'octubre" / "de setembre" */
export function deMes(mes: number) {
  const nom = mesos[mes];
  return /^[aeiouàèéíòóú]/.test(nom) ? `d'${nom}` : `de ${nom}`;
}

/** "13 d'octubre" · "13 de octubre" · "13 October" */
export function diaMes(d: Date | string, idioma: Locale = "ca") {
  const l = local(d);
  if (idioma === "ca") return `${l.dia} ${deMes(l.mes)}`;
  if (idioma === "es") return `${l.dia} de ${NOMS.es.mesos[l.mes]}`;
  return `${l.dia} ${NOMS.en.mesos[l.mes]}`;
}

/** "dimarts 13 d'octubre" · "martes 13 de octubre" · "Tuesday 13 October" */
export function diaComplet(d: Date | string, idioma: Locale = "ca") {
  const l = local(d);
  return `${NOMS[idioma].dies[l.diaSetmana]} ${diaMes(d, idioma)}`;
}

/** Interval de dies: "del 5 al 11 de novembre" · "del 5 al 11 de noviembre" · "5–11 November" (amb el mes del principi si canvia). */
export function rangDies(desDe: Date | string, finsA: Date | string, idioma: Locale = "ca") {
  const a = local(desDe);
  const b = local(finsA);
  const canvia = a.mes !== b.mes;
  if (idioma === "ca") {
    const de = (n: number) => (n === 1 || n === 11 ? `de l'${n}` : `del ${n}`);
    const al = (n: number) => (n === 1 || n === 11 ? `a l'${n}` : `al ${n}`);
    return `${de(a.dia)}${canvia ? ` ${deMes(a.mes)}` : ""} ${al(b.dia)} ${deMes(b.mes)}`;
  }
  if (idioma === "es") return `del ${a.dia}${canvia ? ` de ${NOMS.es.mesos[a.mes]}` : ""} al ${b.dia} de ${NOMS.es.mesos[b.mes]}`;
  return `${a.dia}${canvia ? ` ${NOMS.en.mesos[a.mes]}` : ""}–${b.dia} ${NOMS.en.mesos[b.mes]}`;
}

/** "14:05" */
export function hora(d: Date | string) {
  const l = local(d);
  return `${String(l.hora).padStart(2, "0")}:${String(l.minut).padStart(2, "0")}`;
}

/** "Dimarts" */
export const majuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Data ISO (YYYY-MM-DD) → Date a migdia local, per formatar sense salts d'hora. */
export function deDiaIso(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

/** Propera data (inclòs avui si encara no ha passat l'hora) en què cau un dia ISO (1 = dilluns). */
export function properDia(isoDow: number, ara = new Date()) {
  const l = local(ara);
  const actual = l.diaSetmana === 0 ? 7 : l.diaSetmana;
  const falten = (isoDow - actual + 7) % 7 || 7;
  return new Date(ara.getTime() + falten * 86400000);
}
