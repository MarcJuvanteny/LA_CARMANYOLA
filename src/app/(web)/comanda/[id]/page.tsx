import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ResumConfirmada } from "@/components/web/ResumConfirmada";
import { comandaPublica, confirmaComanda } from "@/lib/comandes/comandes";
import { llegeixSessio, stripeConfigurat } from "@/lib/pagaments/stripe";
import { BuidaCistella, EsperaPagament } from "./Confirmada";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("web.comanda");
  return { title: t("confirmada"), robots: { index: false } };
}

export default async function ConfirmadaPage({ params, searchParams }: PageProps<"/comanda/[id]">) {
  const { id } = await params;
  const { sessio } = await searchParams;
  const t = await getTranslations("web.comanda");
  let comanda = await comandaPublica(id);

  // Tornada de Stripe abans que arribi el webhook (o en local, sense webhook): es comprova la sessió directament.
  if (comanda?.estat === "pendent" && typeof sessio === "string" && sessio === comanda.sessio && stripeConfigurat()) {
    const s = await llegeixSessio(sessio).catch(() => null);
    if (s?.payment_status === "paid" && s.client_reference_id === id) {
      await confirmaComanda(id, sessio);
      comanda = await comandaPublica(id);
    }
  }

  if (!comanda || comanda.estat === "cancel·lada") {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[480px] flex-col items-center justify-center gap-5 px-5 py-16 text-center">
        <p className="m-0 text-[15px]">{comanda ? t("cancellada") : t("noTrobada")}</p>
        <Link href="/carta" className="web-btn bg-granat text-groc">
          {t("anaCarta")}
        </Link>
      </main>
    );
  }

  if (comanda.estat === "pendent") {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[480px] flex-col items-center justify-center gap-5 px-5 py-16 text-center">
        <EsperaPagament />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/isotip-granat.svg" alt="" className="size-14 animate-pulse" />
        <p role="status" className="m-0 text-[15px]">
          {t("esperant")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-7 pb-16">
      <BuidaCistella mobil={comanda.carnet ? comanda.mobil : null} />
      <ResumConfirmada comanda={comanda} />
    </main>
  );
}
