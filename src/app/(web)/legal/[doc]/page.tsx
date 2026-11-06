import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

// Textos legals (web.legal a messages/*.json). Els [CLAUDÀTORS] són dades de l'empresa per omplir.
const DOCS = ["avis-legal", "privacitat", "cookies"] as const;
type Doc = (typeof DOCS)[number];
const clau = (d: Doc) => (d === "avis-legal" ? "avisLegal" : d);

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await params;
  if (!DOCS.includes(doc as Doc)) return {};
  const t = await getTranslations(`web.legal.${clau(doc as Doc)}`);
  return { title: t("titol") };
}

export default async function Legal({ params }: PageProps<"/legal/[doc]">) {
  const { doc } = await params;
  if (!DOCS.includes(doc as Doc)) notFound();
  const t = await getTranslations(`web.legal.${clau(doc as Doc)}`);
  const tg = await getTranslations("web.legal");
  const seccions = t.raw("seccions") as { titol: string; text: string[] }[];

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-5 pt-8 pb-16 md:pt-12">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-[clamp(30px,4.4vw,52px)] leading-[1.08] tracking-[-.02em]">{t("titol")}</h1>
        <p className="m-0 text-sm text-suau">{tg("actualitzat")}</p>
      </header>
      {seccions.map((s) => (
        <section key={s.titol} className="flex flex-col gap-3">
          <h2 className="m-0 text-[22px] text-granat">{s.titol}</h2>
          {s.text.map((p, i) => (
            <p key={i} className="m-0 text-[15px] leading-[1.7]">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
