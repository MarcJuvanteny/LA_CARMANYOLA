import "server-only";
import { createSign } from "node:crypto";
import type { Carnet } from "./carnet";

// Google Wallet: un enllaç "Desa a Google Wallet" amb un JWT signat pel compte de servei.
// La classe i l'objecte viatgen dins del JWT; Google els crea en desar-lo.
//   GOOGLE_WALLET_ISSUER_ID  l'Issuer ID de la Google Pay & Wallet Console
//   GOOGLE_WALLET_SA_EMAIL   el correu del compte de servei
//   GOOGLE_WALLET_SA_KEY     la clau privada del compte de servei (PEM, en base64)

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

export function googleConfigurat() {
  return ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_SA_EMAIL", "GOOGLE_WALLET_SA_KEY"].every((k) => process.env[k]);
}

export function enllacGoogle(c: Carnet, origen: string): string {
  const emissor = process.env.GOOGLE_WALLET_ISSUER_ID!;
  const classe = `${emissor}.carnet-desbowlitzador`;
  const text = (valor: string) => ({ defaultValue: { language: "ca", value: valor } });

  const payload = {
    iss: process.env.GOOGLE_WALLET_SA_EMAIL,
    aud: "google",
    typ: "savetowallet",
    origins: [origen],
    payload: {
      loyaltyClasses: [
        {
          id: classe,
          issuerName: "La Carmanyola",
          programName: "Carnet de desbowlitzador",
          programLogo: { sourceUri: { uri: `${origen}/brand/isotip-groc.png` } },
          hexBackgroundColor: "#77160e",
          reviewStatus: "UNDER_REVIEW",
        },
      ],
      loyaltyObjects: [
        {
          id: `${emissor}.${c.id}`,
          classId: classe,
          state: "ACTIVE",
          accountId: c.id,
          accountName: c.nom,
          loyaltyPoints: { label: "Paraules recuperades", balance: { string: `${c.paraules} de 8` } },
          textModulesData: [
            ...(c.falta ? [{ id: "falta", header: "La que falta", body: c.falta }] : []),
            { id: "complets", header: "Carnets completats", body: String(c.complets) },
          ],
          barcode: { type: "QR_CODE", value: c.id },
          localizedIssuerName: text("La Carmanyola"),
        },
      ],
    },
  };

  const cap = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cos = b64url(JSON.stringify(payload));
  const clau = Buffer.from(process.env.GOOGLE_WALLET_SA_KEY!, "base64").toString("utf8");
  const signatura = createSign("RSA-SHA256").update(`${cap}.${cos}`).sign(clau);
  return `https://pay.google.com/gp/v/save/${cap}.${cos}.${b64url(signatura)}`;
}
