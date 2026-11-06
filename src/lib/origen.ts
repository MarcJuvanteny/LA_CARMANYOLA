import "server-only";
import { headers } from "next/headers";

/**
 * L'adreça pública de l'app. `APP_URL` mana (correus, wallet i webhooks no tenen petició del navegador);
 * si no hi és, la del host de la petició (Codespaces i Vercel passen pel seu proxy).
 */
export async function origen(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  } catch {
    // Fora d'una petició (scripts): cap host.
  }
  return "http://localhost:3000";
}

/** La IP de qui fa la petició, per als límits de peticions. */
export async function ipClient(): Promise<string> {
  try {
    const h = await headers();
    return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || "desconeguda";
  } catch {
    return "desconeguda";
  }
}
