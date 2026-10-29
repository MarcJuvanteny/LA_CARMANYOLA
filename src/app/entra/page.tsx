import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Imagotip } from "@/components/brand/Imagotip";
import { EntraForm } from "./EntraForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("entra");
  return { title: t("titol"), robots: { index: false } };
}

export default async function EntraPage({ searchParams }: { searchParams: Promise<{ torna?: string }> }) {
  const { torna } = await searchParams;
  const t = await getTranslations("entra");
  return (
    <main className="textura-granat grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm rounded-targeta bg-paper p-7">
        <Imagotip className="h-9" />
        <h1 className="mt-6 text-[1.8rem]">{t("titol")}</h1>
        <p className="mt-1 text-suau">{t("subtitol")}</p>
        <EntraForm torna={torna ?? "/panel"} />
      </div>
    </main>
  );
}
