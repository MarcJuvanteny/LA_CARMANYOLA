import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { veu } from "@/lib/db/panel";
import { VeuView } from "./VeuView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("veu") };
}

export default async function VeuPage() {
  return <VeuView inicial={await veu()} />;
}
