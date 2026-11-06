"use server";

import { getLocale, getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { enviaCorreu } from "@/lib/correu/correu";
import { ipClient, origen as origenApp } from "@/lib/origen";
import { serviceClient } from "@/lib/sim/db";
import { normalitzaMobil } from "@/lib/web/mobil";

// Alta pública al carnet: no hi ha sessió, així que escriu el servidor amb la service role.

export interface CarnetNou {
  id: string;
  enllac: string;
  qr: string;
}

export async function faCarnet(dades: FormData): Promise<CarnetNou> {
  const nom = String(dades.get("nom") ?? "")
    .trim()
    .slice(0, 60);
  const mobil = normalitzaMobil(String(dades.get("mobil") ?? ""));
  const correu =
    String(dades.get("correu") ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 200) || null;
  const consent = dades.get("consentiment") === "on";
  if (!nom || !mobil) throw new Error("Falten el nom o el mòbil");
  if (correu && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correu)) throw new Error("El correu no és vàlid");

  const db = serviceClient();
  const { data: dinsLimit } = await db.rpc("limita", { p_clau: `carnet:${await ipClient()}`, p_max: 10, p_segons: 600 });
  if (dinsLimit === false) throw new Error("Massa intents");
  const locale = (await getLocale()) as "ca" | "es" | "en";
  // Un carnet per mòbil: si ja en té, se li torna a donar el seu (per si l'ha perdut del wallet).
  const { data: jaHi } = await db.from("customers").select("id").eq("phone", mobil).eq("simulated", false).maybeSingle();
  let id = jaHi?.id as string | undefined;
  if (!id) {
    const { data, error } = await db
      .from("customers")
      .insert({ first_name: nom, last_name: "", phone: mobil, email: correu, locale, consent_email: consent, consent_at: consent ? new Date().toISOString() : null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id as string;
    // Paraula de regal en fer-se el carnet: carmanyola.
    const regal = await db.rpc("registra_segell_regal", { p_customer_id: id });
    if (regal.error) throw new Error(regal.error.message);
  }

  const origen = await origenApp();
  const enllac = `${origen}/carnet/${id}/wallet`;
  // Correu de benvinguda (transaccional): l'enllaç per desar el carnet al wallet des del mòbil.
  if (correu && !jaHi) {
    const t = await getTranslations("web.carnet.correu");
    await enviaCorreu({ a: correu, assumpte: t("assumpte"), titol: t("titol", { nom }), cos: t("cos", { enllac }), locale, origen }).catch((e) => console.error("[correu]", e));
  }
  const qr = await QRCode.toString(enllac, { type: "svg", margin: 0, color: { dark: "#77160e", light: "#ffffff00" } });
  return { id, enllac, qr };
}
