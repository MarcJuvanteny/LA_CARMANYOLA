import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Imagotip } from "@/components/brand/Imagotip";
import { carnet } from "@/lib/wallet/carnet";

// On acaba el QR quan el wallet encara no està configurat, o si s'obre des d'un ordinador.
export const metadata: Metadata = { robots: { index: false } };

export default async function CarnetPropi({ params }: PageProps<"/carnet/[id]">) {
  const { id } = await params;
  const c = await carnet(id);
  if (!c) notFound();
  const t = await getTranslations("web.carnet");

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-5 pt-7 pb-16 md:pt-12">
      <h1 className="m-0 text-[clamp(30px,4.4vw,48px)] leading-[1.08] tracking-[-.02em]">{t("elTeu", { nom: c.nom })}</h1>
      <div className="tex-granat flex flex-col gap-4 rounded-[20px] p-5 text-groc shadow-[0_12px_30px_rgb(119_22_14/0.22)] md:p-7">
        <Imagotip versio="groc" className="h-6 self-start" />
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-titol truncate text-[22px]">{c.nom}</span>
          <span className="shrink-0 text-[13px]">{t("comptador", { n: c.paraules })}</span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={`aspect-square rounded-full ${i < c.paraules ? "bg-groc" : "border border-groc"}`} />
          ))}
        </div>
      </div>
      <p className="m-0 text-[15px] leading-[1.6]">{t("aviat")}</p>
    </main>
  );
}
