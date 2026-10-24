"use client";

import { useTranslations } from "next-intl";
import { Llegenda } from "@/components/charts/BarresComparades";
import { Rich } from "@/components/Rich";
import { usePanelState } from "@/components/panel/PanelState";
import {
  AiCard,
  AiEyebrow,
  Button,
  ButtonLink,
  Card,
  CardTitle,
  NumberedList,
  PageHeader,
  Pill,
  TableWrap,
  cx,
} from "@/components/panel/ui";

const PROPOSTA = "campanya:segell-doble";

// Escala seqüencial d'un sol to (granat), relativa a la franja amb més comandes.
function escala(v: number, max: number) {
  const r = max ? v / max : 0;
  if (r <= 0.2) return "bg-rosa-clar text-granat";
  if (r <= 0.45) return "bg-rosa text-granat";
  if (r <= 0.75) return "bg-terra text-white";
  return "bg-granat text-white";
}

interface Props {
  dies: string[];
  franges: string[];
  comandes: number[][];
  fluixes: [number, number][];
  previsio: { dia: string; base: number; extra: number }[];
  proposta: { titol: string; punts: string[]; nota: string };
}

export function FrangesView({ dies, franges, comandes: comandesPerFranja, fluixes: frangesFluixes, previsio, proposta: propostaFranja }: Props) {
  const t = useTranslations("panel.franges");
  const { resolts, resol, desfes } = usePanelState();
  const esFluixa = (d: number, f: number) => frangesFluixes.some(([a, b]) => a === d && b === f);
  const maxPrev = Math.max(1, ...previsio.map((p) => p.base + p.extra));
  const maxFranja = Math.max(1, ...comandesPerFranja.flat());
  const estat = resolts[PROPOSTA];

  return (
    <>
      <PageHeader title={t("titol")} subtitle={t("subtitol")} actions={<Pill>{t("ultimes")}</Pill>} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
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

        <AiCard className="self-start">
          <AiEyebrow>{t("iaEyebrow")}</AiEyebrow>
          <h2 className="mt-3 text-[1.6rem]">{propostaFranja.titol}</h2>
          <NumberedList items={propostaFranja.punts} className="mt-4" />
          <p className="mt-4 text-[0.88rem]">
            <Rich text={propostaFranja.nota} />
          </p>
          {estat && estat !== "esborrany" ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold">{t(`estat.${estat}`)}</span>
              <button type="button" className="min-h-11 underline" onClick={() => desfes(PROPOSTA)}>
                {t("desfes")}
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink href="/panel/campanyes?c=segell-doble">{t("prepara")}</ButtonLink>
              <Button variant="ghost" onClick={() => resol(PROPOSTA, "ara-no")}>
                {t("araNo")}
              </Button>
            </div>
          )}
        </AiCard>
      </div>

      <Card className="mt-5">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("previsio")}</CardTitle>
          <Llegenda
            items={[
              { label: t("previsioIa"), className: "bg-rosa" },
              { label: t("ambSegell"), className: "bg-groc border border-dashed border-granat" },
            ]}
          />
        </div>
        <div className="flex h-[230px] items-end justify-around gap-3" aria-hidden>
          {previsio.map((p) => {
            const alt = 190;
            return (
              <div key={p.dia} className="group relative flex flex-1 flex-col items-center">
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-tinta px-2.5 py-1.5 text-xs text-white group-hover:block">
                  {t("tooltipPrevisio", { dia: p.dia, base: p.base, extra: p.extra })}
                </div>
                <span className="mb-1.5 text-[0.78rem]">{p.base + p.extra}</span>
                <div className="flex w-[clamp(28px,5vw,52px)] flex-col">
                  {p.extra > 0 && (
                    <span
                      className="rounded-t border border-b-0 border-dashed border-granat bg-groc"
                      style={{ height: (p.extra / maxPrev) * alt + 6 }}
                    />
                  )}
                  <span
                    className={cx("bg-rosa", p.extra > 0 ? "" : "rounded-t")}
                    style={{ height: (p.base / maxPrev) * alt }}
                  />
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
                <td>{t("tooltipPrevisio", { dia: p.dia, base: p.base, extra: p.extra })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
