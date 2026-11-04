"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { llegeixComanda, preuLinia, type Comanda } from "@/components/web/Cistella";
import { euros } from "@/lib/format";

/** Patró de 7×7 a partir de l'id: dibuix del QR fins que la faixa tingui el codi real. */
function patro(id: string): boolean[] {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Array.from({ length: 49 }, (_, i) => {
    h = Math.imul(h ^ i, 16777619);
    return ((h >>> 0) & 1) === 1;
  });
}

export function Confirmada({ id }: { id: string }) {
  const t = useTranslations("web.comanda");
  const [comanda, setComanda] = useState<Comanda | null | undefined>(undefined);

  useEffect(() => {
    // La comanda es desa al navegador on s'ha fet.
    setComanda(llegeixComanda(id));
  }, [id]);

  if (comanda === undefined) return <main className="min-h-[60vh]" />;

  if (!comanda) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[480px] flex-col items-center justify-center gap-5 px-5 py-16 text-center">
        <p className="m-0 text-[15px]">{t("noTrobada")}</p>
        <Link href="/" className="web-btn bg-granat text-groc">
          {t("tornaInici")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-7 pb-16">
      <header className="flex flex-col items-center gap-3.5 px-2 pt-4 pb-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/isotip-granat.svg" alt="" className="size-14" />
        <h1 className="m-0 text-[30px] tracking-[-.02em]">{t("confirmada")}</h1>
        <p className="m-0 text-[15px] leading-[1.6]">
          {t.rich("recull", { hora: comanda.hora, b: (c) => <strong className="font-semibold">{c}</strong> })}
          <br />
          [ADREÇA], Poblenou
        </p>
      </header>

      <section className="flex flex-col gap-2.5 rounded-[22px] bg-white p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="web-eb m-0 font-cos text-xs tracking-[.1em] text-granat">{t("numero", { n: comanda.numero })}</h2>
          <span className="text-[13px]">{t("estat")}</span>
        </div>
        {comanda.linies.map((l) => (
          <div key={l.id} className="flex justify-between gap-3 text-[15px]">
            <span>
              {l.quantitat} × {l.nom}
              {l.dinar && <span className="block text-xs text-suau">{t("dinar", { nom: l.dinar.nom.toLowerCase() })}</span>}
            </span>
            <span>{euros(preuLinia(l))}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-linia pt-3 text-base font-semibold">
          <span>{t("total")}</span>
          <span>{euros(comanda.total)}</span>
        </div>
      </section>

      <section className="flex flex-col items-center gap-3.5 rounded-[22px] bg-white px-5 py-6 text-center">
        <h2 className="m-0 text-[19px]">{t("primera")}</h2>
        <p className="m-0 text-sm leading-[1.6]">
          {t.rich("primeraText", {
            s: (c) => <span className="text-[#9A9A9C] line-through">{c}</span>,
            b: (c) => <strong className="font-semibold text-granat">{c}</strong>,
          })}
        </p>
        <div role="img" aria-label={t("qr")} className="grid size-[150px] grid-cols-7 gap-[3px] rounded-[14px] border border-linia p-3">
          {patro(comanda.id).map((ple, i) => (
            <span key={i} className={`rounded-[2px] ${ple ? "bg-tinta" : ""}`} />
          ))}
        </div>
        <span className="text-xs text-suau">{t("faixa")}</span>
        <Link href="/carnet" className="self-stretch rounded-xl bg-tinta p-3.5 text-sm font-medium text-paper no-underline">
          {t("apple")}
        </Link>
        <Link href="/carnet" className="self-stretch rounded-xl bg-tinta p-3.5 text-sm font-medium text-paper no-underline">
          {t("google")}
        </Link>
      </section>
    </main>
  );
}
