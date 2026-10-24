import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { vendes } from "@/lib/db/panel";
import { VendesView } from "./VendesView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("vendes") };
}

export default async function VendesPage() {
  const [avui, setmana, mes] = await Promise.all([vendes("avui"), vendes("setmana"), vendes("mes")]);
  return <VendesView dades={{ avui, setmana, mes }} />;
}
