import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { formatInTimeZone } from "date-fns-tz";
import { origen } from "@/lib/origen";
import { supabaseServidor } from "@/lib/supabase/server";
import { ComandesView, type ComandaPanell } from "./ComandesView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("comandes") };
}

/** Les comandes reals d'avui (web i local), amb la faixa per imprimir. Les simulades no tenen faixa. */
export default async function ComandesPage() {
  const supabase = await supabaseServidor();
  const des = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data } = await supabase
    .from("orders")
    .select("id, channel, status, number, customer_name, pickup_at, created_at, total_cents, cart, qr_code, qr_used_at, customer_id")
    .eq("simulated", false)
    .gte("created_at", des)
    .order("created_at", { ascending: false })
    .limit(100);
  const o = await origen();
  const comandes: ComandaPanell[] = await Promise.all(
    (data ?? []).map(async (c) => ({
      id: c.id,
      canal: c.channel,
      estat: c.status,
      numero: c.number ? String(c.number).padStart(4, "0") : null,
      nom: c.customer_name ?? "",
      hora: formatInTimeZone(new Date(c.pickup_at ?? c.created_at), "Europe/Madrid", "HH:mm"),
      total: c.total_cents,
      linies: (c.cart ?? []).map((l: { quantitat: number; nom: string; detall?: string }) => `${l.quantitat} × ${l.nom}${l.detall ? ` (${l.detall})` : ""}`),
      sumada: !!c.qr_used_at,
      qr: c.qr_code ? await QRCode.toString(`${o}/c/${c.qr_code}`, { type: "svg", margin: 0, color: { dark: "#77160e", light: "#ffffff00" } }) : null,
      enllac: c.qr_code ? `${o}/c/${c.qr_code}` : null,
    })),
  );
  return <ComandesView comandes={comandes} />;
}
