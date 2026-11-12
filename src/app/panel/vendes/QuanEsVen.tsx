"use client";

import { useTranslations } from "next-intl";
import { Llegenda } from "@/components/charts/BarresComparades";
import { Rich } from "@/components/Rich";
import {
  AiCard,
  AiEyebrow,
  Card,
  CardTitle,
  NumberedList,
  TableWrap,
  cx,
} from "@/components/panel/ui";

// Escala seqüencial d'un sol to (granat), relativa a la franja amb més comandes.
function escala(v: number, max: number) {
  const r = max ? v / max : 0;
  if (r <= 0.2) return "bg-rosa-clar text-granat";
  if (r <= 0.45) return "bg-rosa text-granat";
  if (r <= 0.75) return "bg-terra text-white";
  return "bg-granat text-white";
}

export interface DadesFranges {
  dies: string[];
  franges: string[];
  comandes: number[][];
  fluixes: [number, number][];
  previsio: { dia: string; base: number }[];
  proposta: { titol: string; punts: string[]; nota: string };
}

/** Secció "Quan es ven" de Vendes: mapa de franges i previsió. Sempre les últimes 8 setmanes. La proposta va al calaix de la IA. */
export function QuanEsVen({ dies, franges, comandes: comandesPerFranja, fluixes: frangesFluixes, previsio }: DadesFranges) {
  const t = useTranslations("panel.franges");
  const esFluixa = (d: number, f: number) => frangesFluixes.some(([a, b]) => a === d && b === f);
  const maxPrev = Math.max(1, ...previsio.map((p) => p.base));
  const maxFranja = Math.max(1, ...comandesPerFranja.flat());

  return (
    <section id="quan" aria-labelledby="quan-titol" className="mt-10 scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="quan-titol" className="titol-seccio text-[1.5rem]">
          {t("seccio")}
        </h2>
        <p className="text-[0.85rem] text-suau">{t("subtitol")}</p>
      </div>

      <div>
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t("perFranja")}</CardTitle>
            <div className="flex items-center gap-1.5 text-[0.78rem] text-suau" aria-hidden>
              {t("poques")}
              <span className="size-3.5 rounded-[3px] bg-rosa-clar" />
              <span className="size-3.5 rounded-[3px] bg-rosa" />
              <span className="size-3.5 rounded-[3px] bg-terra" />
              <span className="size-3.5 rounded-[3px] bg-granat" />
              {t("moltes")}
            </div>
          </div>
          <TableWrap>
            <table className="w-full min-w-[520px] border-separate border-spacing-1.5 text-[0.82rem]">
              <caption className="sr-only">{t("perFranja")}</caption>
              <thead>
                <tr>
                  <td />
                  {franges.map((f) => (
                    <th key={f} scope="col" className="pb-1 text-center font-normal text-suau">
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dies.map((dia, d) => (
                  <tr key={dia}>
                    <th scope="row" className="pr-2 text-left font-normal text-suau">
                      {dia}
                    </th>
                    {franges.map((f, i) => {
                      const v = comandesPerFranja[d][i];
                      const fluixa = esFluixa(d, i);
                      return (
                        <td
                          key={f}
                          title={t("cella", { dia, franja: f, n: v })}
                          className={cx(
                            "h-10 rounded-lg text-center font-semibold",
                            escala(v, maxFranja),
                            fluixa && "outline-[1.5px] outline-offset-[-1px] outline-granat outline-dashed",
                          )}
                        >
                          {v}
                          {fluixa && <span className="sr-only"> · {t("fluixa")}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <p className="mt-3 flex items-center gap-2 text-[0.85rem] text-suau">
            <span aria-hidden className="size-4 rounded border-[1.5px] border-dashed border-granat" />
            {t("llegendaFluixes")}
          </p>
        </Card>

      </div>

      <Card className="mt-5">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("previsio")}</CardTitle>
          <Llegenda items={[{ label: t("previsioIa"), className: "bg-rosa" }]} />
        </div>
        <div className="flex h-[230px] items-end justify-around gap-3" aria-hidden>
          {previsio.map((p) => {
            const alt = 190;
            return (
              <div key={p.dia} className="group relative flex flex-1 flex-col items-center">
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-tinta px-2.5 py-1.5 text-xs text-white group-hover:block">
                  {t("tooltipPrevisio", { dia: p.dia, base: p.base })}
                </div>
                <span className="mb-1.5 text-[0.78rem]">{p.base}</span>
                <div className="flex w-[clamp(28px,5vw,52px)] flex-col">
                  <span className="rounded-t bg-rosa" style={{ height: (p.base / maxPrev) * alt }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-around gap-3 text-[0.78rem] text-suau" aria-hidden>
          {previsio.map((p) => (
            <span key={p.dia} className="flex-1 text-center">
              {p.dia}
            </span>
          ))}
        </div>
        <table className="sr-only">
          <caption>{t("previsio")}</caption>
          <tbody>
            {previsio.map((p) => (
              <tr key={p.dia}>
                <th scope="row">{p.dia}</th>
                <td>{t("tooltipPrevisio", { dia: p.dia, base: p.base })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

/** Què hi veu la IA a les franges fluixes: només lectura (cap campanya associada). Viu al calaix de la IA de Vendes. */
export function LecturaFranges({ proposta: lectura }: { proposta: DadesFranges["proposta"] }) {
  const t = useTranslations("panel.franges");
  return (
    <AiCard>
      <AiEyebrow>{t("iaEyebrow")}</AiEyebrow>
      <h2 className="mt-3 text-[1.2rem]">{lectura.titol}</h2>
      <NumberedList items={lectura.punts} className="mt-4" />
      <p className="mt-4 text-[0.88rem]">
        <Rich text={lectura.nota} />
      </p>
    </AiCard>
  );
}
