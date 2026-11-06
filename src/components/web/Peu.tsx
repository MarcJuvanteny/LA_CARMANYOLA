import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Imagotip } from "@/components/brand/Imagotip";
import { TriaIdioma } from "./TriaIdioma";

export async function Peu() {
  const t = await getTranslations("web");
  return (
    <footer className="tex-granat text-paper">
      <div aria-hidden className="franja-granat" />
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-[clamp(18px,4vw,56px)] py-14">
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
          <Link href="/padro" className="text-paper underline">
            {t("nav.padro")}
          </Link>
          <Link href="/legal/privacitat" className="text-paper underline">
            {t("peu.privacitat")}
          </Link>
          <Link href="/legal/avis-legal" className="text-paper underline">
            {t("peu.avisLegal")}
          </Link>
          <Link href="/legal/cookies" className="text-paper underline">
            {t("peu.cookies")}
          </Link>
        </nav>
        <div className="flex flex-col items-start gap-1">
          {/* Al mòbil la capçalera no hi té lloc: el selector és aquí. */}
          <TriaIdioma className="flex sm:hidden" />
          <span className="text-sm text-groc">{t("peu.lema")}</span>
        </div>
      </div>
      <div aria-hidden className="franja-granat" />
    </footer>
  );
}
