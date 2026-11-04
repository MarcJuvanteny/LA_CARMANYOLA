import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Imagotip } from "@/components/brand/Imagotip";

export async function Peu() {
  const t = await getTranslations("web");
  return (
    <footer className="tex-granat py-[60px] pb-10 text-paper">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-[clamp(18px,4vw,56px)]">
        <Imagotip versio="groc" className="h-[54px]" />
        <nav aria-label={t("peu.label")} className="flex flex-wrap gap-[22px] text-sm">
          <Link href="/carta" className="text-paper underline">
            {t("nav.carta")}
          </Link>
          <Link href="/carnet" className="text-paper underline">
            {t("nav.carnet")}
          </Link>
          <Link href="/carta#alergens" className="text-paper underline">
            {t("peu.alergens")}
          </Link>
          <Link href="/carnet#privacitat" className="text-paper underline">
            {t("peu.privacitat")}
          </Link>
        </nav>
        <span className="text-sm text-groc">{t("peu.lema")}</span>
      </div>
    </footer>
  );
}
