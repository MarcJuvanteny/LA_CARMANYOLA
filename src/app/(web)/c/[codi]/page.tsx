import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { estatFaixa } from "@/lib/comandes/faixa";
import { ipClient } from "@/lib/origen";
import { serviceClient } from "@/lib/sim/db";
import { Paraula, SumaFaixa } from "./SumaFaixa";

// Destí del QR de la faixa "Desbowlitza aquí".
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function Faixa({ params }: PageProps<"/c/[codi]">) {
  const { codi } = await params;
  const t = await getTranslations("web.faixa");
  const { data: ok } = await serviceClient().rpc("limita", { p_clau: `faixa-veure:${await ipClient()}`, p_max: 30, p_segons: 600 });
  const estat = ok === false ? null : await estatFaixa(codi);

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 pt-8 pb-16">
      <header className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/isotip-granat.svg" alt="" className="size-14" />
        <span className="web-eb text-xs tracking-[.1em] text-granat">{t("eyebrow")}</span>
        <h1 className="m-0 text-[clamp(28px,7vw,40px)] leading-[1.08] tracking-[-.02em]">{t("titol")}</h1>
      </header>

      {!estat ? (
        <p className="m-0 text-center text-[15px]">{t("limit")}</p>
      ) : estat.estat === "no-trobada" ? (
        <p className="m-0 text-center text-[15px]">{t("noTrobada")}</p>
      ) : estat.estat === "plataforma" ? (
        <p className="m-0 text-center text-[15px] leading-[1.6]">
          {t.rich("plataforma", { a: (c) => <Link href="/carta" className="text-granat underline">{c}</Link> })}
        </p>
      ) : estat.estat === "ja-sumada" ? (
        estat.paraula ? <Paraula p={estat.paraula} /> : <p className="m-0 text-center text-[15px]">{t("jaSumada")}</p>
      ) : (
        <>
          <p className="m-0 text-center text-[15px] leading-[1.6]">{t("text")}</p>
          <SumaFaixa codi={codi} />
        </>
      )}
    </main>
  );
}
