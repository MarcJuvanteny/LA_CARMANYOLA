import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { comprovaSignatura } from "@/lib/signatura";
import { Baixa } from "./Baixa";

export const metadata: Metadata = { robots: { index: false } };

export default async function BaixaPage({ params }: PageProps<"/baixa/[id]/[token]">) {
  const { id, token } = await params;
  const t = await getTranslations("web.baixa");
  const valid = comprovaSignatura("baixa", id, token);
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 pt-10 pb-16 text-center">
      <h1 className="m-0 text-[clamp(28px,7vw,40px)] leading-[1.08] tracking-[-.02em]">{t("titol")}</h1>
      {valid ? (
        <>
          <p className="m-0 text-[15px] leading-[1.6]">{t("text")}</p>
          <Baixa id={id} token={token} />
        </>
      ) : (
        <p className="m-0 text-[15px]">{t("noValid")}</p>
      )}
    </main>
  );
}
