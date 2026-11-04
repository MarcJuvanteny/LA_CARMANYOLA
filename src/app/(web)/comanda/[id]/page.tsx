import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Confirmada } from "./Confirmada";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("web.comanda");
  return { title: t("confirmada"), robots: { index: false } };
}

export default async function ConfirmadaPage({ params }: PageProps<"/comanda/[id]">) {
  return <Confirmada id={(await params).id} />;
}
