"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BarresComparades, Llegenda } from "@/components/charts/BarresComparades";
import { PROPOSTES, usePanelState } from "@/components/panel/PanelState";
import {
  AiCard,
  AiEyebrow,
  Button,
  Card,
  CardTitle,
  Meter,
  NumberedList,
  PageHeader,
  Segmented,
  StatCard,
  TableWrap,
  td,
  th,
} from "@/components/panel/ui";
import { euros, nombre, percent } from "@/lib/format";
import type { DadesVendes, Periode } from "@/lib/data/vendes";

const PROPOSTA = PROPOSTES.vendes[0];
const signe = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

export function VendesView({ dades }: { dades: Record<Periode, DadesVendes> }) {
  const t = useTranslations("panel.vendes");
  const { resolts, resol, desfes } = usePanelState();
  const [periode, setPeriode] = useState<Periode>("setmana");
  const d = dades[periode];

  const total = Math.max(1, d.canal.web + d.canal.plataformes);
  const maxPlat = Math.max(1, ...d.plats.map((p) => p.ingressos));
  const anterior = t(`anterior.${periode}`);
  const produccio = resolts[PROPOSTA];

  return (
    <>
      <PageHeader
        title={t("titol")}
        subtitle={d.subtitol}
        actions={
          <Segmented<Periode>
            label={t("periode")}
            value={periode}
            onChange={setPeriode}
            options={[
              { value: "avui", label: t("avui") },
              { value: "setmana", label: t("setmana") },
              { value: "mes", label: t("mes") },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("ingressos")}
          value={euros(d.ingressos, { senseDecimals: true })}
          note={`${d.ingressosAnteriors ? percent(d.ingressos / d.ingressosAnteriors - 1, { signe: true }) : "—"} · ${anterior}, ${euros(d.ingressosAnteriors, { senseDecimals: true })}`}
        />
        <StatCard
          label={t("comandes")}
          value={nombre(d.comandes)}
          note={t("comandesNota", { n: signe(d.comandes - d.comandesAnteriors), anterior })}
        />
        <StatCard
          label={t("tiquet")}
          value={euros(d.tiquetMitja)}
          note={`${d.tiquetMitja >= d.tiquetMitjaAnterior ? "+" : ""}${euros(d.tiquetMitja - d.tiquetMitjaAnterior)}`}
        />
        <StatCard
          label={t("ambDinar")}
          value={percent(d.ambDinar)}
          note={t("dinarNota", { n: d.comandesDinar, extra: euros(d.extraDinar, { senseDecimals: true }) })}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <CardTitle>{d.titolGrafic}</CardTitle>
            <Llegenda
              items={[
                { label: t(`llegenda.${periode}.actual`), className: "bg-granat" },
                { label: t(`llegenda.${periode}.anterior`), className: "bg-rosa" },
              ]}
            />
          </div>
          <BarresComparades
            dades={d.perDia}
            format={(v) => euros(v, { senseDecimals: true })}
            llegendaActual={t(`llegenda.${periode}.actual`)}
            llegendaAnterior={t(`llegenda.${periode}.anterior`)}
            titolTaula={d.titolGrafic}
          />
        </Card>

        <Card>
          <CardTitle>{t("perCanal")}</CardTitle>
          <div className="mt-5 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
            <span className="bg-granat" style={{ width: `${(d.canal.web / total) * 100}%` }} />
            <span className="flex-1 bg-rosa" />
          </div>
          <dl className="mt-5 text-[0.92rem]">
            <div className="flex items-center justify-between gap-3 border-b border-linia pb-3.5">
              <dt className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-full bg-granat" />
                {t("webLocal")}
              </dt>
              <dd>
                {euros(d.canal.web, { senseDecimals: true })} · {percent(d.canal.web / total)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-linia py-3.5">
              <dt className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-full bg-rosa" />
                {t("plataformes")}
              </dt>
              <dd>
                {euros(d.canal.plataformes, { senseDecimals: true })} · {percent(d.canal.plataformes / total)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 pt-3.5">
              <dt className="text-suau">{t("comissions")}</dt>
              <dd className="font-semibold text-granat">{euros(-d.canal.comissions, { senseDecimals: true })}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle>{t("perPlat")}</CardTitle>
            <p className="text-[0.82rem] text-suau">
              {t("ames", {
                dinar: euros(d.altres.dinar, { senseDecimals: true }),
                altres: euros(d.altres.acompanyamentsBegudes, { senseDecimals: true }),
              })}
            </p>
          </div>
          <TableWrap>
            <table className="w-full min-w-[560px] text-[0.92rem]">
              <thead>
                <tr>
                  <th className={th}>{t("plat")}</th>
                  <th className={th}>{t("unitats")}</th>
                  <th className={th}>{t("ingressos")}</th>
                  <th className={th}>
                    <span className="sr-only">{t("pes")}</span>
                  </th>
                  <th className={th}>{t("vs", { anterior })}</th>
                </tr>
              </thead>
              <tbody>
                {d.plats.map((p) => (
                  <tr key={p.nom}>
                    <td className={td}>{p.nom}</td>
                    <td className={`${td} text-suau`}>{p.unitats}</td>
                    <td className={`${td} whitespace-nowrap text-suau`}>{euros(p.ingressos)}</td>
                    <td className={`${td} w-[34%]`}>
                      <Meter value={p.ingressos / maxPlat} />
                    </td>
                    <td className={`${td} whitespace-nowrap text-granat`}>{percent(p.variacio, { signe: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>

        <AiCard className="self-start">
          <AiEyebrow>{t("iaEyebrow")}</AiEyebrow>
          <h2 className="mt-3 text-[1.35rem]">{d.ia.titol}</h2>
          <NumberedList items={d.ia.punts} className="mt-4" />
          {produccio ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm" role="status">
              <span className="font-semibold">{produccio === "aprovada" ? t("produccioAjustada") : t("decideixXef")}</span>
              <button type="button" className="min-h-11 underline" onClick={() => desfes(PROPOSTA)}>
                {t("desfes")}
              </button>
            </div>
          ) : (
            <Button className="mt-5" onClick={() => resol(PROPOSTA, "aprovada")}>
              {t("ajusta")}
            </Button>
          )}
        </AiCard>
      </div>
    </>
  );
}
