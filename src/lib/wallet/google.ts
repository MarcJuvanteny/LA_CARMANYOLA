import "server-only";
import { createSign } from "node:crypto";
import type { Carnet } from "./carnet";

// Google Wallet: un enllaç "Desa a Google Wallet" amb un JWT signat pel compte de servei.
// La classe i l'objecte viatgen dins del JWT; Google els crea en desar-lo.
// Després, per actualitzar-lo (paraula nova, avís), l'API REST amb un token OAuth del mateix compte.
//   GOOGLE_WALLET_ISSUER_ID  l'Issuer ID de la Google Pay & Wallet Console
//   GOOGLE_WALLET_SA_EMAIL   el correu del compte de servei
//   GOOGLE_WALLET_SA_KEY     la clau privada del compte de servei (PEM, en base64)

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const API = "https://walletobjects.googleapis.com/walletobjects/v1";

export function googleConfigurat() {
  return ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_SA_EMAIL", "GOOGLE_WALLET_SA_KEY"].every((k) => process.env[k]);
}

const emissor = () => process.env.GOOGLE_WALLET_ISSUER_ID!;
const idClasse = () => `${emissor()}.carnet-desbowlitzador`;
export const idObjecte = (clientId: string) => `${emissor()}.${clientId}`;

function jwt(payload: object) {
  const cap = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cos = b64url(JSON.stringify(payload));
  const clau = Buffer.from(process.env.GOOGLE_WALLET_SA_KEY!, "base64").toString("utf8");
  return `${cap}.${cos}.${b64url(createSign("RSA-SHA256").update(`${cap}.${cos}`).sign(clau))}`;
}

/** El contingut que canvia de la targeta: paraules, la que falta, carnets completats i l'avís. */
function camps(c: Carnet) {
  return {
    loyaltyPoints: { label: "Paraules recuperades", balance: { string: `${c.paraules} de 8` } },
    textModulesData: [
      ...(c.falta ? [{ id: "falta", header: "La que falta", body: c.falta }] : []),
      { id: "complets", header: "Carnets completats", body: String(c.complets) },
      ...(c.avis ? [{ id: "avis", header: "Avís", body: c.avis }] : []),
    ],
  };
}

export function enllacGoogle(c: Carnet, origen: string): string {
  const text = (valor: string) => ({ defaultValue: { language: "ca", value: valor } });
  return `https://pay.google.com/gp/v/save/${jwt({
    iss: process.env.GOOGLE_WALLET_SA_EMAIL,
    aud: "google",
    typ: "savetowallet",
    origins: [origen],
    payload: {
      loyaltyClasses: [
        {
          id: idClasse(),
          issuerName: "La Carmanyola",
          programName: "Carnet de desbowlitzador",
          programLogo: { sourceUri: { uri: `${origen}/brand/isotip-groc.png` } },
          hexBackgroundColor: "#77160e",
          reviewStatus: "UNDER_REVIEW",
        },
      ],
      loyaltyObjects: [
        {
          id: idObjecte(c.id),
          classId: idClasse(),
          state: "ACTIVE",
          accountId: c.id,
          accountName: c.nom,
          ...camps(c),
          barcode: { type: "QR_CODE", value: c.id },
          localizedIssuerName: text("La Carmanyola"),
        },
      ],
    },
  })}`;
}

let tokenEnCache: { token: string; caduca: number } | null = null;

async function tokenOAuth(): Promise<string> {
  if (tokenEnCache && tokenEnCache.caduca > Date.now() + 60_000) return tokenEnCache.token;
  const ara = Math.floor(Date.now() / 1000);
  const assertion = jwt({
    iss: process.env.GOOGLE_WALLET_SA_EMAIL,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: ara,
    exp: ara + 3600,
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`Google OAuth: ${json.error_description ?? r.status}`);
  tokenEnCache = { token: json.access_token, caduca: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/**
 * Actualitza la targeta d'un client a Google Wallet i, si hi ha avís, li envia una notificació.
 * Si el client no l'ha desada mai, Google torna 404: no passa res.
 */
export async function actualitzaGoogle(c: Carnet, avis?: { titol: string; text: string }): Promise<"ok" | "no-desada"> {
  const token = await tokenOAuth();
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const r = await fetch(`${API}/loyaltyObject/${encodeURIComponent(idObjecte(c.id))}`, { method: "PATCH", headers: h, body: JSON.stringify(camps(c)), cache: "no-store" });
  if (r.status === 404) return "no-desada";
  if (!r.ok) throw new Error(`Google Wallet: ${r.status} ${await r.text()}`);
  if (avis) {
    const m = await fetch(`${API}/loyaltyObject/${encodeURIComponent(idObjecte(c.id))}/addMessage`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ message: { id: `avis-${Date.now()}`, header: avis.titol, body: avis.text, messageType: "TEXT_AND_NOTIFY" } }),
      cache: "no-store",
    });
    if (!m.ok) throw new Error(`Google Wallet (avís): ${m.status}`);
  }
  return "ok";
}
