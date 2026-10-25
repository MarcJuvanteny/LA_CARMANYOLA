"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AiCard,
  AiEyebrow,
  ButtonLink,
  Card,
  CardTitle,
  CarnetDots,
  Meter,
  NumberedList,
  PageHeader,
  Pill,
  Segmented,
  TableWrap,
  cx,
  td,
  th,
} from "@/components/panel/ui";
import { PARAULES_CARNET, type Client, type Segment } from "@/lib/data/clients";

const VISIBLES = 8;

interface Props {
  clients: Client[];
  recompte: Record<Segment, number>;
  ia: Record<Segment, { titol: string; punts: string[]; accio: string } | null>;
}

export function ClientsView({ clients, recompte, ia }: Props) {
  const t = useTranslations("panel.clients");
  const [segment, setSegment] = useState<Segment>("risc");
  const [visibles, setVisibles] = useState(VISIBLES);

  const llista = useMemo(
    () => clients.filter((c) => c.segments.includes(segment)).sort((a, b) => b.risc - a.risc),
    [clients, segment],
  );
  const [seleccio, setSeleccio] = useState<string>(llista[0]?.id);
  const actual = llista.find((c) => c.id === seleccio) ?? llista[0];
  const files = llista.slice(0, visibles);
  const proposta = ia[segment];

  const canvia = (s: Segment) => {
    setSegment(s);
    setVisibles(VISIBLES);
    const primer = clients.filter((c) => c.segments.includes(s)).sort((a, b) => b.risc - a.risc)[0];
    setSeleccio(primer?.id);
  };

  const segments: Segment[] = ["tots", "risc", "nous", "adormits"];

  return (
    <>
      <PageHeader
        title={t("titol")}
        subtitle={t("subtitol", { n: recompte.tots })}
        actions={
          <Segmented<Segment>
            label={t("segments")}
            value={segment}
            onChange={canvia}
            options={segments.map((s) => ({ value: s, label: t(`segment.${s}`), count: recompte[s] }))}
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="self-start">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle>
              {t(`segment.${segment}`)} · {recompte[segment]}
            </CardTitle>
            <p className="text-[0.82rem] text-suau">{t(`descripcio.${segment}`)}</p>
          </div>
          <TableWrap>
            <table className="w-full min-w-[680px] text-[0.92rem]">
              <thead>
                <tr>
                  <th className={th}>{t("client")}</th>
                  <th className={th}>{t("venia")}</th>
                  <th className={th}>{t("senseVenir")}</th>
                  <th className={th}>{t("carnet")}</th>
                  <th className={th}>{t("preferit")}</th>
                  <th className={th}>{t("risc")}</th>
                </tr>
              </thead>
              <tbody>
                {files.map((c) => {
                  const sel = c.id === actual?.id;
                  return (
                    <tr key={c.id} className={cx(sel && "bg-paper/70")}>
                      <td className={td}>
                        <button
                          type="button"
                          onClick={() => setSeleccio(c.id)}
                          aria-pressed={sel}
                          className="min-h-11 text-left font-medium underline-offset-2 hover:underline"
                        >
                          {c.nom}
                        </button>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{c.venia}</td>
                      <td className={cx(td, "whitespace-nowrap", segment === "risc" || segment === "adormits" ? "font-semibold text-granat" : "")}>
                        {t("dies", { n: c.senseVenir })}
                      </td>
                      <td className={td}>
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <CarnetDots filled={c.paraules} label={t("paraules", { n: c.paraules, total: PARAULES_CARNET })} />
                          <span className="text-[0.78rem] text-suau">
                            {c.paraules}/{PARAULES_CARNET}
                            {c.carnets > 0 && ` · ${t("complets", { n: c.carnets })}`}
                          </span>
                        </span>
                      </td>
                      <td className={td}>{c.platPreferit}</td>
                      <td className={td}>
                        <span className="flex items-center gap-2">
                          <Meter value={c.risc / 100} className="w-10" />
                          <span className="text-[0.78rem] text-suau">{c.risc}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.8rem] text-suau">
            <p>{t("peu", { n: files.length, total: recompte[segment] })}</p>
            {llista.length > VISIBLES && (
              <button
                type="button"
                className="min-h-11 font-semibold text-granat"
                onClick={() => setVisibles((v) => (v >= llista.length ? VISIBLES : v + 20))}
              >
                {visibles >= llista.length ? t("menys") : t("mes")}
              </button>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          {proposta && (
            <AiCard>
              <AiEyebrow>{t("iaEyebrow")}</AiEyebrow>
              <h2 className="mt-3 text-[1.35rem]">{proposta.titol}</h2>
              <NumberedList items={proposta.punts} className="mt-4" />
              <ButtonLink className="mt-5" href="/panel/campanyes">
                {proposta.accio}
              </ButtonLink>
            </AiCard>
          )}

          {actual && (
            <Card aria-live="polite">
              <p className="eyebrow text-tinta">{t("fitxa")}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <h2 className="text-[1.35rem]">{actual.nom}</h2>
                <Pill>{t("complets", { n: actual.carnets })}</Pill>
              </div>
              <dl className="mt-4 space-y-2.5 text-[0.9rem]">
                <Fila label={t("comandes")}>{t("comandesMesos", { n: actual.comandes, mesos: actual.mesos })}</Fila>
                <Fila label={t("ultima")}>{actual.ultima}</Fila>
                <Fila label={t("carnet")}>
                  <span className="flex items-center justify-end gap-2">
                    <CarnetDots filled={actual.paraules} label={t("paraules", { n: actual.paraules, total: PARAULES_CARNET })} />
                    <span className="text-suau">
                      {actual.paraules}/{PARAULES_CARNET}
                    </span>
                  </span>
                </Fila>
                <Fila label={t("liFalta")}>
                  <span className="font-semibold text-granat">{actual.liFalta}</span>
                </Fila>
                <Fila label={t("avisos")}>{t(`avis.${actual.avisos}`)}</Fila>
              </dl>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-suau">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
