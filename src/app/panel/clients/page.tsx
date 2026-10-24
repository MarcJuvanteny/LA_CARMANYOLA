import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { clients } from "@/lib/db/panel";
import { ClientsView } from "./ClientsView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("clients") };
}

export default async function ClientsPage() {
  const c = await clients();
  return <ClientsView clients={c.llista} recompte={c.recompte} ia={c.ia} />;
}
