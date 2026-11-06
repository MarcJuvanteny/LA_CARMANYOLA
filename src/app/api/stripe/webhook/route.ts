import { cancellaComanda, confirmaComanda } from "@/lib/comandes/comandes";
import { verificaWebhook } from "@/lib/pagaments/stripe";

// Webhook de Stripe: és qui confirma de veritat el pagament. Es verifica la signatura
// amb el cos en cru (no es pot parsejar abans). Stripe hi torna si no responem 2xx.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Falta STRIPE_WEBHOOK_SECRET", { status: 500 });
  const cos = await req.text();
  if (!verificaWebhook(cos, req.headers.get("stripe-signature"), secret)) return new Response("Signatura no vàlida", { status: 400 });

  const ev = JSON.parse(cos) as { type: string; data: { object: { id: string; client_reference_id?: string; payment_status?: string; metadata?: Record<string, string> } } };
  const s = ev.data.object;
  const comanda = s.client_reference_id ?? s.metadata?.comanda;
  if (!comanda) return Response.json({ ignorat: true });

  if ((ev.type === "checkout.session.completed" && s.payment_status === "paid") || ev.type === "checkout.session.async_payment_succeeded") {
    await confirmaComanda(comanda, s.id);
  } else if (ev.type === "checkout.session.expired" || ev.type === "checkout.session.async_payment_failed") {
    await cancellaComanda(comanda);
  }
  return Response.json({ rebut: true });
}
