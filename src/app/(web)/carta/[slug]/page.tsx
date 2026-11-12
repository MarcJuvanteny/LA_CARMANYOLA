import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { plats as cartaLocal, type Idioma, type Nutricio as DadesNutricio } from "@/lib/data/carta";
import { cartaPublica } from "@/lib/db/web";
import { euros } from "@/lib/format";
import { fitxa, opcionsDinar, platWeb } from "@/lib/web/contingut";
import { Afegeix } from "./Afegeix";

export const revalidate = 300;

export function generateStaticParams() {
  return cartaLocal.map((p) => ({ slug: p.slug }));
}

async function busca(slug: string) {
  const carta = await cartaPublica();
  const plat = carta.find((p) => p.slug === slug);
  return plat ? { plat, carta } : null;
}

export async function generateMetadata({ params }: PageProps<"/carta/[slug]">): Promise<Metadata> {
  const r = await busca((await params).slug);
  const idioma = (await getLocale()) as Idioma;
  return r ? { title: r.plat.nom, description: fitxa(r.plat.slug, idioma)?.descripcio ?? (r.plat.descripcio[idioma] || r.plat.descripcio.ca) } : {};
}

export default async function FitxaPage({ params }: PageProps<"/carta/[slug]">) {
  const r = await busca((await params).slug);
  if (!r) notFound();
  const { plat, carta } = r;
  const t = await getTranslations("web.fitxa");
  const idioma = (await getLocale()) as Idioma;
  const f = fitxa(plat.slug, idioma);
  const web = platWeb(plat, idioma);
  const ambDinar = plat.seccio === "casa" || plat.seccio === "fes";
  const dinar = ambDinar ? carta.filter((p) => opcionsDinar.includes(p.slug) && p.disponible).map((p) => ({ slug: p.slug, nom: p.nom })) : [];
  // El Fes-te'l tu es tria en un popup, des de la carta.
  if (plat.seccio === "fes") redirect("/carta?feste");

  return (
    <main className="mx-auto w-full max-w-[1240px] pb-10 md:px-[clamp(18px,4vw,56px)] md:pt-6">
      <div className="grid md:grid-cols-2 md:items-start md:gap-[clamp(32px,5vw,72px)]">
        <div className="flex flex-col gap-2 rounded-b-[32px] bg-white px-5 pt-[18px] pb-8 md:sticky md:top-28 md:rounded-[32px] md:p-8">
          <Link href="/carta" aria-label={t("tornaCarta")} className="flex size-11 items-center justify-center rounded-full border border-linia text-tinta">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          {web.imatge && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={web.imatge} alt={`${plat.nom} a la carmanyola, vist des de dalt`} className="aspect-square w-[min(300px,100%)] self-center object-contain md:w-full md:max-w-[480px]" />
          )}
        </div>

        <div className="flex flex-col gap-7 px-5 pt-7 md:px-0 md:pt-4">
          <div className="flex flex-col gap-2.5">
            {web.lema && <span className="web-eb text-xs tracking-[.1em] text-granat">{web.lema}</span>}
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="m-0 text-[clamp(30px,4vw,56px)] leading-[1.05] tracking-[-.02em]">{plat.nom}</h1>
              <span className="font-titol text-[clamp(20px,2vw,28px)] whitespace-nowrap">{euros(plat.preu)}</span>
            </div>
            <p className="m-0 text-[15px] leading-[1.6] md:text-[17px]">{f?.descripcio ?? (plat.descripcio[idioma] || plat.descripcio.ca)}</p>
          </div>

          {f && (
            <section className="flex flex-col gap-3.5">
              <h2 className={titolSeccio}>{t("dins")}</h2>
              <div className="flex items-center gap-[18px]">
                <svg width="104" height="104" viewBox="0 0 120 120" role="img" aria-label={t("envas")} className="shrink-0">
                  <circle cx="60" cy="60" r="56" fill="#FFFFFF" stroke="#38383A" strokeWidth="2" />
                  <path d="M74.8 6 A56 56 0 0 1 74.8 114 Z" fill="#F7F2E9" />
                  <line x1="74.8" y1="6" x2="74.8" y2="114" stroke="#38383A" strokeWidth="2" />
                </svg>
                <dl className="m-0 flex flex-col gap-2.5 text-sm leading-[1.45]">
                  <div>
                    <dt className="font-semibold">{t("zonaGran")}</dt>
                    <dd className="m-0">{f.zones.gran}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">{t("zonaPetita")}</dt>
                    <dd className="m-0">{f.zones.petita}</dd>
                  </div>
                </dl>
              </div>
              {f.nota && <p className="m-0 text-sm leading-[1.6]">{f.nota}</p>}
            </section>
          )}

          {!!f?.empadronats.length && (
            <section className="flex flex-col gap-1">
              <h2 className={`${titolSeccio} mb-1.5`}>{t("empadronats")}</h2>
              {f.empadronats.map((e) => (
                <div key={e.nom} className="flex justify-between border-b border-linia py-3 text-[15px]">
                  <span className="font-medium">{e.nom}</span>
                  <span>{e.comarca}</span>
                </div>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-2.5">
            <h2 className={titolSeccio}>{t("alergens")}</h2>
            <p className="m-0 text-[15px] leading-[1.6]">{plat.alergens.length ? plat.alergens.map((a, i) => (i ? a : a[0].toUpperCase() + a.slice(1))).join(" · ") : t("senseAlergens")}</p>
            <p className="m-0 text-xs leading-[1.6] text-suau">
              {f?.notaAlergens ? `${f.notaAlergens} ` : ""}
              {t("traces")}
            </p>
          </section>

          {plat.nutricio && <Nutricio n={plat.nutricio} idioma={idioma} t={t} />}

          <Afegeix plat={{ slug: plat.slug, nom: plat.nom, preu: plat.preu, disponible: plat.disponible }} dinar={dinar} />
        </div>
      </div>
    </main>
  );
}

const titolSeccio = "web-eb m-0 font-cos text-xs tracking-[.1em] text-granat";

/**
 * Informació nutricional en segon nivell (plegada): transparència, sense reclams (Reglament (UE) 1924/2006).
 * Taula en l'ordre del Reglament (UE) 1169/2011, per ració.
 */
function Nutricio({ n, idioma, t }: { n: DadesNutricio; idioma: Idioma; t: Awaited<ReturnType<typeof getTranslations<"web.fitxa">>> }) {
  const num = (v: number, decimals = 1) => new Intl.NumberFormat(idioma, { maximumFractionDigits: decimals }).format(v);
  const files: [string, string, boolean?][] = [
    [t("nutricio.energia"), `${num(Math.round(n.kcal * 4.184), 0)} kJ / ${num(n.kcal, 0)} kcal`],
    [t("nutricio.greixos"), `${num(n.greixos)} g`],
    [t("nutricio.saturats"), `${num(n.saturats)} g`, true],
    [t("nutricio.hidrats"), `${num(n.hidrats)} g`],
    [t("nutricio.sucres"), `${num(n.sucres)} g`, true],
    [t("nutricio.proteines"), `${num(n.proteines)} g`],
    [t("nutricio.sal"), `${num(n.sal, 2)} g`],
  ];
  return (
    <details className="group rounded-[18px] border border-linia px-4 py-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
        {t("nutricio.titol")}
        <span aria-hidden className="transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <table className="mb-3 w-full text-[14px]">
        <caption className="pb-2 text-left text-xs text-suau">{t("nutricio.perRacio", { grams: num(n.grams, 0) })}</caption>
        <tbody>
          {files.map(([nom, valor, sub]) => (
            <tr key={nom} className="border-t border-linia">
              <th scope="row" className={`py-1.5 text-left font-normal ${sub ? "pl-4 text-suau" : ""}`}>
                {nom}
              </th>
              <td className="py-1.5 text-right tabular-nums">{valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="m-0 mb-3 text-xs leading-[1.6] text-suau">{t("nutricio.font")}</p>
    </details>
  );
}
