import "server-only";
import path from "node:path";
import { PKPass } from "passkit-generator";
import { signa } from "@/lib/signatura";
import type { Carnet } from "./carnet";

// Apple Wallet: el .pkpass ha d'anar signat amb el certificat del Pass Type ID.
// Sense aquestes variables, la ruta del QR mostra la pàgina d'"aviat al teu wallet".
//   APPLE_PASS_TYPE_ID   pass.cat.lacarmanyola.carnet
//   APPLE_TEAM_ID        l'ID de l'equip d'Apple Developer
//   APPLE_PASS_CERT      certificat del pass, PEM en base64
//   APPLE_PASS_KEY       clau privada, PEM en base64
//   APPLE_PASS_KEY_PASS  contrasenya de la clau (opcional)
//   APPLE_WWDR           certificat intermedi WWDR G4 d'Apple, PEM en base64
// La targeta porta webServiceURL: l'iPhone es registra a /api/wallet i rep un push quan canvia.

export const pem = (nom: string) => Buffer.from(process.env[nom] ?? "", "base64").toString("utf8");

export function appleConfigurat() {
  return ["APPLE_PASS_TYPE_ID", "APPLE_TEAM_ID", "APPLE_PASS_CERT", "APPLE_PASS_KEY", "APPLE_WWDR"].every((k) => process.env[k]);
}

/** El token que l'iPhone envia al servei web ("ApplePass <token>"). Derivat del carnet: no cal desar-lo. */
export const tokenApple = (id: string) => signa("wallet-apple", id, 40);

export async function passApple(c: Carnet, origen: string): Promise<Buffer> {
  const pass = await PKPass.from(
    {
      model: path.join(process.cwd(), "src/lib/wallet/model.pass"),
      certificates: {
        wwdr: pem("APPLE_WWDR"),
        signerCert: pem("APPLE_PASS_CERT"),
        signerKey: pem("APPLE_PASS_KEY"),
        signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASS,
      },
    },
    {
      formatVersion: 1,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!,
      teamIdentifier: process.env.APPLE_TEAM_ID!,
      serialNumber: c.id,
      organizationName: "La Carmanyola",
      description: "Carnet de desbowlitzador",
      logoText: "Carnet de desbowlitzador",
      backgroundColor: "rgb(119, 22, 14)",
      foregroundColor: "rgb(255, 234, 128)",
      labelColor: "rgb(245, 240, 232)",
      // Apple només parla amb HTTPS: en local (http) la targeta funciona però no s'actualitza.
      ...(origen.startsWith("https://") && { webServiceURL: `${origen}/api/wallet`, authenticationToken: tokenApple(c.id) }),
    },
  );
  pass.primaryFields.push({ key: "paraules", label: "Paraules recuperades", value: `${c.paraules} de 8`, changeMessage: "Has recuperat una paraula: %@" });
  pass.secondaryFields.push({ key: "nom", label: "Desbowlitzador", value: c.nom });
  if (c.falta) pass.secondaryFields.push({ key: "falta", label: "La que falta", value: c.falta });
  pass.auxiliaryFields.push({ key: "complets", label: "Carnets completats", value: c.complets, changeMessage: "Carnet complet: les postres són nostres" });
  // L'avís (campanya o Què Queda) va al darrere; el changeMessage fa que l'iPhone el notifiqui.
  if (c.avis) pass.backFields.push({ key: "avis", label: "Avís", value: c.avis, changeMessage: "%@" });
  pass.backFields.push({ key: "com", label: "Com funciona", value: "Cada comanda directa a La Carmanyola recupera una paraula d'aquí. Amb vuit, les postres són nostres." });
  pass.backFields.push({ key: "baixa", label: "Avisos", value: "Si no vols rebre avisos, esborra la targeta o escriu-nos." });
  pass.setBarcodes({ message: c.id, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1" });
  return pass.getAsBuffer();
}
