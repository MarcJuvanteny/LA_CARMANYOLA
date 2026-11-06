"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { mobilCarnet, recordaMobilCarnet } from "@/components/web/Cistella";
import type { ParaulaFaixa } from "@/lib/comandes/faixa";
import { suma } from "./actions";

export function Paraula({ p }: { p: ParaulaFaixa }) {
  const t = useTranslations("web.faixa");
  return (
    <p role="status" className="m-0 rounded-[18px] bg-groc px-5 py-4 text-center text-[17px] leading-[1.5] text-granat">
      {p.a
        ? t.rich("sumada", {
            nom: p.nom,
            de: p.de ?? "",
            a: p.a,
            n: p.paraules,
            s: (c) => <span className="line-through opacity-60">{c}</span>,
            b: (c) => <strong className="font-semibold">{c}</strong>,
          })
        : t("sumadaSenseParaula", { nom: p.nom, n: p.paraules })}
      {p.complet && <span className="mt-1 block font-semibold">{t("complet")}</span>}
    </p>
  );
}

/** El mòbil del carnet (el dispositiu el recorda) i un botó. */
export function SumaFaixa({ codi }: { codi: string }) {
  const t = useTranslations("web.faixa");
  const [mobil, setMobil] = useState("");
  const [resultat, setResultat] = useState<Awaited<ReturnType<typeof suma>> | null>(null);
  const [enviant, envia] = useTransition();

  useEffect(() => setMobil(mobilCarnet()), []);

  if (resultat?.estat === "sumada") return <Paraula p={resultat.paraula} />;
  if (resultat?.estat === "ja-sumada") return resultat.paraula ? <Paraula p={resultat.paraula} /> : <p className="m-0 text-center">{t("jaSumada")}</p>;

  return (
    <form
      className="flex flex-col gap-4 rounded-[22px] bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        envia(async () => {
          const r = await suma(codi, mobil).catch(() => ({ estat: "error" as const }));
          if (r.estat === "sumada") recordaMobilCarnet(mobil);
          setResultat(r as Awaited<ReturnType<typeof suma>>);
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mobil-faixa" className="text-[13px] font-medium">
          {t("mobil")}
        </label>
        <input
          id="mobil-faixa"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={mobil}
          onChange={(e) => setMobil(e.target.value)}
          placeholder="600 000 000"
          className="h-[50px] rounded-xl border border-linia bg-white px-4 text-base"
        />
      </div>
      {resultat && (
        <p role="alert" className="m-0 text-[15px] leading-[1.5] text-granat">
          {resultat.estat === "sense-carnet" ? (
            t.rich("senseCarnet", { a: (c) => <Link href="/carnet" className="text-granat underline">{c}</Link> })
          ) : resultat.estat === "limit" ? t("limit") : t("error")}
        </p>
      )}
      <button type="submit" disabled={enviant} className="cursor-pointer rounded-full border-0 bg-granat p-[17px] text-[13px] font-medium tracking-[.06em] text-paper uppercase disabled:opacity-60">
        {enviant ? t("sumant") : t("suma")}
      </button>
    </form>
  );
}
