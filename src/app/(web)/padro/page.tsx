import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { Idioma } from "@/lib/data/carta";
import { padroPublic, type IngredientPublic } from "@/lib/db/web";
import { padro as padroIllustrat } from "@/lib/web/contingut";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("web.padro");
  return { title: t("titol"), description: t("text") };
}

function Llista({ titol, items, nota }: { titol: string; items: IngredientPublic[]; nota: (i: IngredientPublic) => string | null }) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 text-[clamp(24px,3vw,36px)] text-granat">{titol}</h2>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <li key={i.slug} className="flex flex-col gap-1 rounded-[20px] bg-white p-5">
            <span className="font-titol text-[22px]">{i.nom}</span>
            {i.comarca && <span className="text-sm">{i.comarca}</span>}
            {nota(i) && <span className="text-xs text-suau">{nota(i)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PadroPage() {
  const t = await getTranslations("web.padro");
  const padro = await padroPublic();
  const empadronats = padro.filter((i) => i.estat === "empadronat" || i.estat === "baixa-proposada");
  const venen = padro.filter((i) => i.estat === "ve-aviat" || i.estat === "alta-proposada");
  const baixes = padro.filter((i) => i.estat === "de-baixa");

  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-12 px-5 pt-8 pb-16 md:px-[clamp(18px,4vw,56px)] md:pt-12">
      <header className="flex max-w-[720px] flex-col gap-3">
        <span className="web-eb text-xs tracking-[.1em] text-granat">{t("eyebrow")}</span>
        <h1 className="m-0 text-[clamp(34px,5vw,68px)] leading-[1.05] tracking-[-.02em]">{t("titol")}</h1>
        <p className="m-0 text-[15px] leading-[1.6] md:text-[17px]">{t("text")}</p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="m-0 text-[clamp(24px,3vw,36px)] text-granat">{t("qui")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {padroIllustrat((await getLocale()) as Idioma).map((p) => (
            <article key={p.ingredient} className="flex flex-col overflow-hidden rounded-[22px] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imatge} alt={p.foto} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="flex flex-col gap-2 p-5">
                <span className="font-titol text-[26px] leading-none">{p.ingredient}</span>
                <span className="text-sm">{p.origen}</span>
                <span className="text-xs text-suau">{p.fins}</span>
                <blockquote className="m-0 mt-2 text-[15px] leading-[1.5]">
                  {p.cita}
                  <footer className="mt-1 text-xs text-suau">{p.qui}</footer>
                </blockquote>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Llista titol={t("empadronats")} items={empadronats} nota={(i) => (i.baixa ? t("fins", { quan: i.baixa }) : null)} />
      <Llista titol={t("venen")} items={venen} nota={(i) => (i.alta ? t("desDe", { quan: i.alta }) : null)} />
      <Llista titol={t("baixes")} items={baixes} nota={() => t("tornara")} />

      <p className="m-0 text-[15px]">
        {t.rich("carnet", { a: (c) => <Link href="/carnet" className="text-granat underline">{c}</Link> })}
      </p>
    </main>
  );
}
