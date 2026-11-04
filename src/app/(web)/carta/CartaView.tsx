"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BarraComanda } from "@/components/web/BarraComanda";
import { useCistella } from "@/components/web/Cistella";
import { TriaFeste } from "@/components/web/TriaFeste";
import type { Seccio } from "@/lib/data/carta";
import { euros } from "@/lib/format";
import type { PlatWeb } from "@/lib/web/contingut";

type Filtre = "tot" | "vega" | "vegetaria" | "senseGluten";

const passa: Record<Filtre, (p: PlatWeb) => boolean> = {
  tot: () => true,
  vega: (p) => p.etiquetes.includes("vegà"),
  vegetaria: (p) => p.etiquetes.includes("vegà") || p.etiquetes.includes("vegetarià"),
  senseGluten: (p) => !p.alergens.includes("gluten"),
};

/** "Vegà · gluten": etiquetes i al·lèrgens en una línia */
const detall = (p: PlatWeb) => [...p.etiquetes.map((e) => e[0].toUpperCase() + e.slice(1)), ...p.alergens].join(" · ");

export function CartaView({ plats, seccions }: { plats: PlatWeb[]; seccions: Seccio[] }) {
  const t = useTranslations("web.carta");
  const { afegeix } = useCistella();
  const [filtre, setFiltre] = useState<Filtre>("tot");
  const [afegit, setAfegit] = useState<string | null>(null);
  const [feste, setFeste] = useState(false);
  const platFeste = plats.find((p) => p.seccio === "fes");

  // Qui arriba des de /carta/fes-te-l-tu (?feste) ja el troba obert.
  useEffect(() => {
    if (new URLSearchParams(location.search).has("feste")) setFeste(true);
  }, []);

  const posa = (p: PlatWeb) => {
    afegeix({ slug: p.slug, nom: p.nom, preu: p.preu });
    setAfegit(p.slug);
    setTimeout(() => setAfegit((s) => (s === p.slug ? null : s)), 1200);
  };

  const boto = (p: PlatWeb) => (
    <button
      type="button"
      disabled={!p.disponible}
      aria-label={t("afegeix", { plat: p.nom })}
      onClick={() => (p.seccio === "fes" ? setFeste(true) : posa(p))}
      className="relative z-10 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-granat text-xl leading-none text-groc transition-transform hover:scale-110 active:scale-90 disabled:cursor-not-allowed disabled:bg-linia disabled:text-suau"
    >
      {afegit === p.slug ? "✓" : "+"}
    </button>
  );

  return (
    <main className="mx-auto w-full max-w-[1240px] px-[clamp(16px,4vw,56px)] pt-6 pb-20">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[clamp(34px,5vw,72px)] leading-none tracking-[-.02em]">{t("titol")}</h1>
        <span className="text-sm">{t("subtitol")}</span>
      </div>

      <nav aria-label={t("filtres")} className="sense-barra -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 py-4">
        {(["tot", "vega", "vegetaria", "senseGluten"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filtre === f}
            onClick={() => setFiltre(f)}
            className={`shrink-0 cursor-pointer rounded-full border px-4 py-2.5 text-[13px] font-medium ${filtre === f ? "border-tinta bg-tinta text-paper" : "border-linia bg-white text-tinta"}`}
          >
            {t(f)}
          </button>
        ))}
      </nav>

      {seccions.map((seccio) => {
        const llista = plats.filter((p) => p.seccio === seccio && passa[filtre](p));
        const gran = seccio === "casa" || seccio === "fes";
        return (
          <section key={seccio} id={seccio} className="mt-6 scroll-mt-28">
            <h2 className="web-eb mx-1 mb-3 font-cos text-xs tracking-[.1em] text-granat">{t(`seccions.${seccio}`)}</h2>
            {!llista.length ? (
              <p className="mx-1 text-sm text-suau">{t("buit")}</p>
            ) : gran ? (
              <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
                {llista.map((p) => (
                  <article
                    key={p.slug}
                    className={`relative flex items-center gap-3.5 rounded-[20px] bg-white py-3 pr-3.5 pl-3 shadow-[0_1px_2px_rgb(56_56_58/0.04),0_6px_18px_rgb(56_56_58/0.05)] ${p.disponible ? "" : "opacity-60"} ${seccio === "fes" ? "border border-linia" : ""}`}
                  >
                    {p.imatge && seccio === "casa" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imatge} alt="" className="size-[84px] shrink-0 object-contain" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {seccio === "fes" ? (
                        <button
                          type="button"
                          disabled={!p.disponible}
                          onClick={() => setFeste(true)}
                          aria-haspopup="dialog"
                          className="font-titol cursor-pointer border-0 bg-transparent p-0 text-left text-base leading-tight text-tinta after:absolute after:inset-0 after:rounded-[20px]"
                        >
                          {p.nom}
                        </button>
                      ) : (
                        <Link href={`/carta/${p.slug}`} className="font-titol text-base leading-tight text-tinta no-underline after:absolute after:inset-0 after:rounded-[20px]">
                          {p.nom}
                        </Link>
                      )}
                      <span className="text-[13px] leading-[1.4]">{p.resum}</span>
                      {(p.lema || !p.disponible) && <span className="text-xs text-granat">{p.disponible ? p.lema : t("noDisponible")}</span>}
                    </div>
                    <div className="flex flex-col items-end gap-2 self-stretch justify-between">
                      <span className="font-titol text-[15px] whitespace-nowrap">{euros(p.preu)}</span>
                      {boto(p)}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid gap-x-10 md:grid-cols-2">
                {llista.map((p) => (
                  <div key={p.slug} className={`flex items-center justify-between gap-3 border-b border-linia py-3.5 ${p.disponible ? "" : "opacity-60"}`}>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-medium">{p.nom}</span>
                      <span className="text-xs text-suau">{p.disponible ? p.resum || detall(p) : t("noDisponible")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-medium whitespace-nowrap">{euros(p.preu)}</span>
                      {boto(p)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <p id="alergens" className="m-0 mt-6 scroll-mt-28 px-1 text-xs leading-[1.6] text-suau">
        {t("nota")}
      </p>

      <BarraComanda />
      {platFeste && <TriaFeste obert={feste} tanca={() => setFeste(false)} plat={{ slug: platFeste.slug, nom: platFeste.nom, preu: platFeste.preu }} />}
    </main>
  );
}
