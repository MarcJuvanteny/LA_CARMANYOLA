import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/idiomes";
import { deDiaIso, diaComplet, local, majuscula } from "@/lib/dates";
import { queQueda } from "@/lib/db/panel";
import { supabaseServidor } from "@/lib/supabase/server";
import { ImprimeixCuina } from "./ImprimeixCuina";
import { ButtonLink, Card, CardTitle, PageHeader, Pill, TableWrap } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("cuina") };
}

const avuiIso = () => {
  const l = local(new Date());
  return `${l.any}-${String(l.mes + 1).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`;
};

/**
 * La producció per a cuina: el que l'amo ha decidit a Vendes ("Ajusta la producció"), en gran i per imprimir.
 * Demà: la proposta de la IA (si l'amo l'ha enviada) o la producció habitual (si ho decideix el xef o encara no s'ha mirat).
 * Avui: el pla que es va enviar ahir, si n'hi ha.
 */
export default async function CuinaPage() {
  const [t, l, qq, supabase] = await Promise.all([getTranslations("panel.cuina"), getLocale(), queQueda(), supabaseServidor()]);
  const idioma = l as Locale;
  const avui = avuiIso();
  const { data: plaAvui } = await supabase.from("production_plans").select("planned, status, dishes(name)").eq("day", avui).eq("status", "enviat");

  const estat = qq.produccio.estat as "enviat" | "xef" | null;
  const dema = qq.produccio.items.map((p) => ({
    id: p.id,
    nom: p.nom,
    habitual: p.abans,
    racions: estat === "enviat" ? p.despres : p.abans,
    ajustat: estat === "enviat" && p.despres !== p.abans,
    motiu: p.motiu,
  }));
  const totalDema = dema.reduce((s, p) => s + p.racions, 0);
  const diaDema = majuscula(diaComplet(deDiaIso(qq.produccio.dema), idioma));

  return (
    <>
      <PageHeader title={t("titol")} subtitle={t("subtitol")} actions={<ImprimeixCuina etiqueta={t("imprimeix")} />} />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("dema", { dia: diaDema })}</CardTitle>
          <Pill dashed={estat !== "enviat"}>{t(`estat.${estat ?? "pendent"}`)}</Pill>
        </div>
        {dema.length === 0 ? (
          <p className="text-suau">{t("buit")}</p>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[480px] text-left">
              <caption className="sr-only">{t("dema", { dia: diaDema })}</caption>
              <thead className="text-[0.82rem] text-suau">
                <tr>
                  <th scope="col" className="pb-2 font-normal">{t("plat")}</th>
                  <th scope="col" className="pb-2 text-right font-normal">{t("racions")}</th>
                  <th scope="col" className="pb-2 pl-6 font-normal">{t("perQue")}</th>
                </tr>
              </thead>
              <tbody>
                {dema.map((p) => (
                  <tr key={p.id} className="border-t border-linia">
                    <th scope="row" className="py-3 pr-4 text-[1.05rem] font-semibold">{p.nom}</th>
                    <td className="xifra py-3 text-right text-[1.6rem]">
                      {p.racions}
                      {p.ajustat && (
                        <span className="ml-2 align-middle text-[0.8rem] font-normal text-suau">
                          {t("habitual", { n: p.habitual })}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-6 text-[0.9rem] text-suau">{p.ajustat ? p.motiu : t("senseCanvis")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-tinta">
                  <th scope="row" className="pt-3 text-left">{t("total")}</th>
                  <td className="xifra pt-3 text-right text-[1.6rem]">{totalDema}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        )}
        {estat === null && dema.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3 print:hidden">
            <p className="m-0 text-[0.9rem]">{t("pendentNota")}</p>
            <ButtonLink href="/panel/vendes#ia" variant="ghost">
              {t("revisa")}
            </ButtonLink>
          </div>
        )}
      </Card>

      {plaAvui && plaAvui.length > 0 && (
        <Card className="mt-5">
          <CardTitle>{t("avui")}</CardTitle>
          <ul className="m-0 mt-3 grid list-none gap-x-8 gap-y-2 p-0 sm:grid-cols-2">
            {plaAvui.map((p, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4 border-b border-linia py-2">
                <span>{(p.dishes as unknown as { name: string } | null)?.name ?? "—"}</span>
                <span className="xifra text-[1.2rem]">{p.planned}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
