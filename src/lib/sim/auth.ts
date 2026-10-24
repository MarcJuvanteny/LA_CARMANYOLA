import { timingSafeEqual } from "node:crypto";

/** Rutes /api/sim: només amb `Authorization: Bearer ${SIM_SECRET}`. */
export function autoritzat(req: Request): boolean {
  const secret = process.env.SIM_SECRET;
  const capcalera = req.headers.get("authorization") ?? "";
  if (!secret || !capcalera.startsWith("Bearer ")) return false;
  const a = Buffer.from(capcalera.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
