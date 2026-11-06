import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Stripe Checkout en mode de prova, amb l'API REST (sense SDK).
//   STRIPE_SECRET_KEY      sk_test_...
//   STRIPE_WEBHOOK_SECRET  whsec_... (Dashboard → Webhooks, o `stripe listen` en local)
// Sense STRIPE_SECRET_KEY, la comanda es confirma sense cobrar (mode demo).

const API = "https://api.stripe.com/v1";

export const stripeConfigurat = () => !!process.env.STRIPE_SECRET_KEY;

/** Stripe vol form-urlencoded amb claus niades: line_items[0][price_data][currency]=eur */
function codifica(obj: unknown, prefix = "", out = new URLSearchParams()) {
  if (obj === undefined || obj === null) return out;
  if (typeof obj !== "object") {
    out.append(prefix, String(obj));
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) codifica(v, prefix ? `${prefix}[${k}]` : k, out);
  return out;
}

async function stripe<T>(metode: "GET" | "POST", ruta: string, cos?: unknown): Promise<T> {
  const r = await fetch(`${API}${ruta}`, {
    method: metode,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(cos ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: cos ? codifica(cos).toString() : undefined,
    cache: "no-store",
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`Stripe: ${json?.error?.message ?? r.status}`);
  return json as T;
}

export interface SessioCheckout {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: "open" | "complete" | "expired";
  client_reference_id: string | null;
  metadata: Record<string, string>;
}

export function creaSessio(d: {
  comanda: string;
  linies: { nom: string; detall?: string; unitat: number; quantitat: number }[];
  origen: string;
  locale: "ca" | "es" | "en";
}) {
  return stripe<SessioCheckout>("POST", "/checkout/sessions", {
    mode: "payment",
    client_reference_id: d.comanda,
    metadata: { comanda: d.comanda },
    payment_intent_data: { metadata: { comanda: d.comanda } },
    // Stripe no té català: es fa servir el castellà.
    locale: d.locale === "en" ? "en" : "es",
    success_url: `${d.origen}/comanda/${d.comanda}?sessio={CHECKOUT_SESSION_ID}`,
    cancel_url: `${d.origen}/carta?pagament=cancellat`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    line_items: d.linies.map((l) => ({
      quantity: l.quantitat,
      price_data: {
        currency: "eur",
        unit_amount: l.unitat,
        product_data: { name: l.nom, ...(l.detall && { description: l.detall.slice(0, 300) }) },
      },
    })),
  });
}

export const llegeixSessio = (id: string) => stripe<SessioCheckout>("GET", `/checkout/sessions/${encodeURIComponent(id)}`);

/**
 * Verifica la capçalera `Stripe-Signature` (t=...,v1=...): HMAC-SHA256 de `${t}.${cos}`.
 * Rebutja els esdeveniments de més de 5 minuts (atacs de repetició).
 */
export function verificaWebhook(cos: string, capcalera: string | null, secret: string, ara = Date.now(), tolerancia = 300): boolean {
  if (!capcalera) return false;
  const parts = capcalera.split(",").map((p) => p.trim().split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const firmes = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !firmes.length) return false;
  if (Math.abs(ara / 1000 - Number(t)) > tolerancia) return false;
  const esperada = Buffer.from(createHmac("sha256", secret).update(`${t}.${cos}`).digest("hex"));
  return firmes.some((f) => {
    const b = Buffer.from(f);
    return b.length === esperada.length && timingSafeEqual(b, esperada);
  });
}
