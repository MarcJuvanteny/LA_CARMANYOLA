import "server-only";
import http2 from "node:http2";
import { serviceClient } from "@/lib/sim/db";
import { appleConfigurat, pem } from "./apple";
import { carnet } from "./carnet";
import { actualitzaGoogle, googleConfigurat } from "./google";

// Quan la targeta canvia (paraula nova, carnet complet, avís), se n'avisa els dos wallets.
// Apple: un push buit a cada iPhone registrat; l'iPhone torna a demanar el .pkpass a /api/wallet.
// Google: PATCH de l'objecte i, si hi ha avís, un missatge amb notificació.

/** Push d'Apple Wallet: HTTP/2 a APNs amb el mateix certificat del pass. Torna els tokens que ja no valen. */
async function pushApple(tokens: string[]): Promise<string[]> {
  if (!tokens.length) return [];
  const client = http2.connect("https://api.push.apple.com", {
    cert: pem("APPLE_PASS_CERT"),
    key: pem("APPLE_PASS_KEY"),
    passphrase: process.env.APPLE_PASS_KEY_PASS,
  });
  try {
    const morts = await Promise.all(
      tokens.map(
        (t) =>
          new Promise<string | null>((resol) => {
            const req = client.request({ ":method": "POST", ":path": `/3/device/${t}`, "apns-topic": process.env.APPLE_PASS_TYPE_ID! });
            req.on("response", (h) => resol(h[":status"] === 410 ? t : null));
            req.on("error", () => resol(null));
            req.end("{}");
          }),
      ),
    );
    return morts.filter((t): t is string => !!t);
  } finally {
    client.close();
  }
}

export async function avisaWallet(clientId: string, avis?: { titol: string; text: string }) {
  const db = serviceClient();
  if (avis) await db.from("customers").update({ wallet_message: avis.text, wallet_updated_at: new Date().toISOString() }).eq("id", clientId);

  const resultat = { apple: 0, google: false };
  const c = await carnet(clientId);
  if (!c) return resultat;

  if (appleConfigurat()) {
    try {
      const { data } = await db.from("wallet_devices").select("push_token").eq("customer_id", clientId);
      const tokens = [...new Set((data ?? []).map((d) => d.push_token as string))];
      const morts = await pushApple(tokens);
      if (morts.length) await db.from("wallet_devices").delete().eq("customer_id", clientId).in("push_token", morts);
      resultat.apple = tokens.length - morts.length;
    } catch (e) {
      console.error("[wallet] push d'Apple", e);
    }
  }
  if (googleConfigurat()) {
    try {
      resultat.google = (await actualitzaGoogle(c, avis)) === "ok";
    } catch (e) {
      console.error("[wallet] Google", e);
    }
  }
  return resultat;
}

/** Té alguna targeta on arribar? (iPhone registrat o Google configurat: Google diu 404 si no l'ha desada). */
export async function teWallet(clientId: string) {
  if (googleConfigurat()) return true;
  if (!appleConfigurat()) return false;
  const { count } = await serviceClient().from("wallet_devices").select("device_id", { count: "exact", head: true }).eq("customer_id", clientId);
  return (count ?? 0) > 0;
}
