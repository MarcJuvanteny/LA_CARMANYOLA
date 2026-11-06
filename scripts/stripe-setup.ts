// Registra el webhook de Stripe (mode de prova) per a l'app desplegada i imprimeix el secret.
//   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts [https://la-carmanyola.vercel.app]
// Si ja n'hi ha un amb la mateixa URL, l'esborra i en crea un de nou (Stripe només mostra el secret en crear-lo).

const clau = process.env.STRIPE_SECRET_KEY;
if (!clau?.startsWith("sk_test_")) {
  console.error("Cal STRIPE_SECRET_KEY amb una clau de prova (sk_test_...).");
  process.exit(1);
}
const app = (process.argv[2] ?? process.env.APP_URL ?? "https://la-carmanyola.vercel.app").replace(/\/$/, "");
const url = `${app}/api/stripe/webhook`;
const events = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"];

async function stripe<T>(metode: string, ruta: string, cos?: URLSearchParams): Promise<T> {
  const r = await fetch(`https://api.stripe.com/v1${ruta}`, { method: metode, headers: { Authorization: `Bearer ${clau}` }, body: cos });
  const json = await r.json();
  if (!r.ok) throw new Error(`Stripe: ${json?.error?.message ?? r.status}`);
  return json as T;
}

async function main() {
  const existents = await stripe<{ data: { id: string; url: string }[] }>("GET", "/webhook_endpoints?limit=100");
  for (const w of existents.data.filter((w) => w.url === url)) {
    await stripe("DELETE", `/webhook_endpoints/${w.id}`);
    console.log(`Esborrat el webhook anterior ${w.id}`);
  }

  const cos = new URLSearchParams({ url, description: "La Carmanyola · comandes" });
  events.forEach((e, i) => cos.append(`enabled_events[${i}]`, e));
  const nou = await stripe<{ id: string; secret: string }>("POST", "/webhook_endpoints", cos);

  console.log(`\nWebhook ${nou.id} → ${url}\n`);
  console.log("Afegeix a Vercel (Production) i a .env.local:\n");
  console.log(`STRIPE_SECRET_KEY=${clau}`);
  console.log(`STRIPE_WEBHOOK_SECRET=${nou.secret}`);
  console.log(`APP_URL=${app}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
