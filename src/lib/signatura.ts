import { createHmac, timingSafeEqual } from "node:crypto";

// Tokens que no cal desar: la baixa amb un clic i el token del servei web d'Apple Wallet.
// Es signen amb TOKENS_SECRET (o SIM_SECRET si encara no n'hi ha).

const secret = () => {
  const s = process.env.TOKENS_SECRET ?? process.env.SIM_SECRET;
  if (!s) throw new Error("Falta TOKENS_SECRET");
  return s;
};

export const signa = (proposit: string, valor: string, llargada = 32) =>
  createHmac("sha256", secret()).update(`${proposit}:${valor}`).digest("base64url").slice(0, llargada);

export function comprovaSignatura(proposit: string, valor: string, token: string, llargada = 32) {
  const a = Buffer.from(signa(proposit, valor, llargada));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
