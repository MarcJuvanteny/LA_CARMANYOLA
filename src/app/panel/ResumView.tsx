"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { BarresComparades, Llegenda } from "@/components/charts/BarresComparades";
import { usePanelState } from "@/components/panel/PanelState";
import { AiCard, AiEyebrow, ButtonLink, Card, CardTitle, Meter, PageHeader, Pill, StatCard, cx } from "@/components/panel/ui";
import type { Ingredient } from "@/lib/data/padro";
import type { DadesVendes } from "@/lib/data/vendes";
import { diesSetmana, local } from "@/lib/dates";
import { euros, nombre, percent } from "@/lib/format";

const signe = (n: number) => (n > 0 ? `+${n} comandes` : n < 0 ? `−${-n} comandes` : "Les mateixes comandes");

interface Props {
  avui: DadesVendes;
  setmana: DadesVendes;
  ara: { subtitol: string; temps: string; hora: string };
  queden: { nom: string; previsio: number }[];
  empadronats: Ingredient[];
  carnet: { total: number; aprenents: number; desbowlitzadors: number; mestres: number; paraules_setmana: number; complets_setmana: number; directes: number | null };
  propostes: { id: string; seccio: string; titol: string; href: string }[];
}

export function ResumView({ avui, setmana, ara, queden, empadronats, carnet: cb, propostes: propostesDelDia }: Props) {
  const t = useTranslations("panel.resum");
  const tn = useTranslations("panel.nav");
  const { resolts, pendents } = usePanelState();
  const carnet = {
    total: cb.total,
    paraulesSetmana: cb.paraules_setmana,
    carnetsComplets: cb.complets_setmana,
    directes: cb.directes ?? 0,
    nivells: [
      { nom: "Aprenent", n: cb.aprenents },
      { nom: "Desbowlitzador", n: cb.desbowlitzadors },
      { nom: "Mestre de la carmanyola", n: cb.mestres },
    ],
  };
  const maxNivell = Math.max(1, ...carnet.nivells.map((n) => n.n));
  const n = pendents();
  const dia = diesSetmana[local(new Date()).diaSetmana];

  return (
    <>
      <PageHeader title={t("titol")} subtitle={ara.subtitol} actions={<Pill>{ara.temps}</Pill>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("ingressos")}
          value={euros(avui.ingressos, { senseDecimals: true })}
          note={t("vsDimarts", { v: avui.ingressosAnteriors ? percent(avui.ingressos / avui.ingressosAnteriors - 1, { signe: true }) : "—", dia })}
        />
        <StatCard label={t("comandes")} value={nombre(avui.comandes)} note={t("mesQue", { v: signe(avui.comandes - avui.comandesAnteriors), dia })} />
        <StatCard
          label={t("tiquet")}
          value={euros(avui.tiquetMitja)}
          note={`${avui.tiquetMitja >= avui.tiquetMitjaAnterior ? "+" : ""}${euros(avui.tiquetMitja - avui.tiquetMitjaAnterior)}`}
        />
        <StatCard label={t("ambDinar")} value={percent(avui.ambDinar)} note={t("dinarNota", { n: avui.comandesDinar })} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <AiCard>
          <AiEyebrow>{t("iaEyebrow")}</AiEyebrow>
          <h2 className="mt-3 text-[1.6rem]">{n > 0 ? t("propostes", { n }) : t("totRevisat")}</h2>
          <ul className="mt-4 divide-y divide-granat/15">
            {propostesDelDia.map((p) => {
              const estat = resolts[p.id];
              const fet = estat && estat !== "esborrany";
              return (
                <li key={p.id}>
                  <Link href={p.href} className="group flex min-h-14 items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="eyebrow block text-granat">{tn(p.seccio)}</span>
                      <span className={cx("block text-[0.95rem]", fet && "text-suau line-through")}>{p.titol}</span>
                    </span>
                    <span className="shrink-0 text-[0.82rem] font-semibold text-granat group-hover:underline">
                      {fet ? t(`estat.${estat}`) : t("revisa")}
                      <span aria-hidden> →</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </AiCard>

        <div className="space-y-5">
          <Card>
            <p className="eyebrow text-tinta">{t("araMateix")}</p>
            <h2 className="mt-2 text-[1.3rem]">{t("queQueda", { hora: ara.hora })}</h2>
            <ul className="mt-3 space-y-1.5 text-[0.9rem]">
              {queden.map((f) => (
                <li key={f.nom} className="flex justify-between gap-3">
                  <span>{f.nom}</span>
                  <span className="font-titol text-granat">{f.previsio}</span>
                </li>
              ))}
            </ul>
            <ButtonLink href="/panel/que-queda" variant="outline" className="mt-4">
              {resolts["quequeda:avis"] === "aprovada" ? t("avisActiu") : t("preparaAvis")}
            </ButtonLink>
          </Card>
          <Card>
            <p className="eyebrow text-tinta">{t("padro")}</p>
            <p className="mt-2 text-[0.92rem]">{t("empadronats", { n: empadronats.length })}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {empadronats.map((i) => (
                <li key={i.id}>
                  <Pill>
                    {i.nom} <span className="ml-1 text-suau">· {i.comarca}</span>
                  </Pill>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{t("setmana")}</CardTitle>
              <p className="mt-1 text-[0.82rem] text-suau">
                {euros(setmana.ingressos, { senseDecimals: true })} ·{" "}
                {setmana.ingressosAnteriors ? percent(setmana.ingressos / setmana.ingressosAnteriors - 1, { signe: true }) : "—"}
              </p>
            </div>
            <Llegenda
              items={[
                { label: t("aquesta"), className: "bg-granat" },
                { label: t("passada"), className: "bg-rosa" },
              ]}
            />
          </div>
          <BarresComparades
            dades={setmana.perDia}
            alcada={140}
            format={(v) => euros(v, { senseDecimals: true })}
            llegendaActual={t("aquesta")}
            llegendaAnterior={t("passada")}
            titolTaula={t("setmana")}
          />
          <Link href="/panel/vendes" className="mt-3 inline-flex min-h-11 items-center text-[0.85rem] font-semibold text-granat hover:underline">
            {t("veureVendes")} <span aria-hidden>&nbsp;→</span>
          </Link>
        </Card>

        <Card>
          <CardTitle>{t("carnet")}</CardTitle>
          <p className="mt-1 text-[0.82rem] text-suau">{t("ambCarnet", { n: carnet.total })}</p>
          <ul className="mt-4 space-y-3">
            {carnet.nivells.map((nv) => (
              <li key={nv.nom} className="text-[0.88rem]">
                <span className="flex justify-between">
                  <span>{nv.nom}</span>
                  <span className="text-suau">{nv.n}</span>
                </span>
                <Meter value={nv.n / maxNivell} className="mt-1.5" />
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-linia pt-4 text-[0.82rem]">
            <div>
              <dt className="text-suau">{t("paraulesSetmana")}</dt>
              <dd className="font-titol text-[1.4rem]">{carnet.paraulesSetmana}</dd>
            </div>
            <div>
              <dt className="text-suau">{t("complets")}</dt>
              <dd className="font-titol text-[1.4rem]">{carnet.carnetsComplets}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[0.8rem] text-suau">{t("directes", { pct: percent(carnet.directes) })}</p>
        </Card>
      </div>
    </>
  );
}
