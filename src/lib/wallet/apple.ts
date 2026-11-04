import "server-only";
import path from "node:path";
import { PKPass } from "passkit-generator";
import type { Carnet } from "./carnet";

// Apple Wallet: el .pkpass ha d'anar signat amb el certificat del Pass Type ID.
// Sense aquestes variables, la ruta del QR mostra la pàgina d'"aviat al teu wallet".
//   APPLE_PASS_TYPE_ID   pass.cat.lacarmanyola.carnet
//   APPLE_TEAM_ID        l'ID de l'equip d'Apple Developer
//   APPLE_PASS_CERT      certificat del pass, PEM en base64
//   APPLE_PASS_KEY       clau privada, PEM en base64
//   APPLE_PASS_KEY_PASS  contrasenya de la clau (opcional)
//   APPLE_WWDR           certificat intermedi WWDR G4 d'Apple, PEM en base64

const pem = (nom: string) => Buffer.from(process.env[nom] ?? "", "base64").toString("utf8");

export function appleConfigurat() {
  return ["APPLE_PASS_TYPE_ID", "APPLE_TEAM_ID", "APPLE_PASS_CERT", "APPLE_PASS_KEY", "APPLE_WWDR"].every((k) => process.env[k]);
}

export async function passApple(c: Carnet): Promise<Buffer> {
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
    },
  );
  pass.primaryFields.push({ key: "paraules", label: "Paraules recuperades", value: `${c.paraules} de 8` });
  pass.secondaryFields.push({ key: "nom", label: "Desbowlitzador", value: c.nom });
  if (c.falta) pass.secondaryFields.push({ key: "falta", label: "La que falta", value: c.falta });
  pass.auxiliaryFields.push({ key: "complets", label: "Carnets completats", value: c.complets });
  pass.backFields.push({ key: "com", label: "Com funciona", value: "Cada comanda directa a La Carmanyola recupera una paraula d'aquí. Amb vuit, les postres són nostres." });
  pass.setBarcodes({ message: c.id, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1" });
  return pass.getAsBuffer();
}
