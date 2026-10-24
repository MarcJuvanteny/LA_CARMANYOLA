// Dates en català, sempre en hora de Barcelona i deterministes (servidor = navegador).

const TZ = "Europe/Madrid";
export const mesos = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];
export const diesSetmana = ["diumenge", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"];
export const diesCurts = ["Dg", "Dl", "Dt", "Dc", "Dj", "Dv", "Ds"];

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

/** "13 d'octubre" */
export function diaMes(d: Date | string) {
  const l = local(d);
  return `${l.dia} ${deMes(l.mes)}`;
}

/** "dimarts 13 d'octubre" */
export function diaComplet(d: Date | string) {
  const l = local(d);
  return `${diesSetmana[l.diaSetmana]} ${l.dia} ${deMes(l.mes)}`;
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
