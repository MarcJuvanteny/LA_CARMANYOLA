"use client";

import { useState } from "react";
import { actualitzaPlat } from "@/app/panel/actions";
import { useTranslations } from "next-intl";
import { Card, CardTitle, PageHeader, Pill, Segmented, cx } from "@/components/panel/ui";
import type { Idioma, Plat, Seccio } from "@/lib/data/carta";
import { euros } from "@/lib/format";

interface Props {
  plats: Plat[];
  seccions: Seccio[];
  suplementDinar: number;
}

export function CartaView({ plats: inicials, seccions, suplementDinar }: Props) {
  const t = useTranslations("panel.carta");
  const [plats, setPlats] = useState(inicials);
  const [seleccio, setSeleccio] = useState(inicials[0].slug);
  const [idioma, setIdioma] = useState<Idioma>("ca");
  const actual = plats.find((p) => p.slug === seleccio)!;

  const [error, setError] = useState(false);
  const canvia = (slug: string, patch: Partial<Plat>, desa = true) => {
    setPlats((ps) => ps.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));
    if (!desa) return;
    setError(false);
    actualitzaPlat(slug, {
      ...(patch.disponible !== undefined && { available: patch.disponible }),
      ...(patch.queQuedaOk !== undefined && { que_queda_ok: patch.queQuedaOk }),
      ...(patch.preu !== undefined && { price_cents: patch.preu }),
      ...(patch.descripcio !== undefined && { description: patch.descripcio }),
    }).catch(() => setError(true));
  };

  const disponibles = plats.filter((p) => p.disponible).length;

  return (
    <>
      <PageHeader
        title={t("titol")}
        subtitle={t("subtitol", { n: disponibles, total: plats.length })}
        actions={<Pill>{t("dinar", { preu: euros(suplementDinar) })}</Pill>}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="self-start">
          {seccions.map((s, idx) => {
            const llista = plats.filter((p) => p.seccio === s);
            const ambQueQueda = s === "casa";
            return (
              <section key={s} className={cx(idx > 0 && "mt-7")}>
                <div className="flex items-end justify-between gap-3">
                  <CardTitle as="h2">{t(`seccio.${s}`)}</CardTitle>
                  <div className="hidden gap-6 text-right sm:flex" aria-hidden>
                    <span className="eyebrow w-20 text-tinta">{t("avui")}</span>
                    {ambQueQueda && <span className="eyebrow w-20 text-tinta">{t("queQueda")}</span>}
                  </div>
                </div>
                <ul className="mt-2">
                  {llista.map((p) => (
                    <li
                      key={p.slug}
                      className={cx(
                        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-linia py-2.5",
                        p.slug === actual.slug && "bg-paper/70",
                        !p.disponible && "text-suau",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSeleccio(p.slug)}
                        aria-pressed={p.slug === actual.slug}
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className={cx("font-medium", !p.disponible && "line-through")}>{p.nom}</span>
                        {p.temporada === "tardor" && <Etiqueta>{t("tardor")}</Etiqueta>}
                        {p.etiquetes.map((e) => (
                          <Etiqueta key={e}>{e}</Etiqueta>
                        ))}
                      </button>
                      <span className="flex items-center gap-6">
                        <span className="w-16 text-right text-[0.92rem]">{euros(p.preu)}</span>
                        <span className="flex w-20 justify-end">
                          <Interruptor
                            on={p.disponible}
                            onChange={(disponible) => canvia(p.slug, { disponible })}
                            label={t("avuiPlat", { plat: p.nom })}
                          />
                        </span>
                        {ambQueQueda && (
                          <span className="flex w-20 justify-end">
                            <Interruptor
                              on={p.queQuedaOk}
                              onChange={(queQuedaOk) => canvia(p.slug, { queQuedaOk })}
                              label={t("queQuedaPlat", { plat: p.nom })}
                            />
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="mt-6 text-[0.82rem] text-suau">{t("nota")}</p>
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-granat">
              {t("errorDesa")}
            </p>
          )}
        </Card>

        <Card className="self-start lg:sticky lg:top-8">
          <p className="eyebrow text-tinta">{t("fitxa")}</p>
          <h2 className="mt-2 text-[1.5rem]">{actual.nom}</h2>
          <p className="mt-1 text-[0.85rem] text-suau">{t(`seccio.${actual.seccio}`)}</p>

          <div className="mt-5">
            <label htmlFor="preu" className="eyebrow mb-1.5 block text-tinta">
              {t("preu")}
            </label>
            <div className="flex items-center gap-2">
              <PreuInput
                key={actual.slug}
                centims={actual.preu}
                onChange={(preu) => canvia(actual.slug, { preu }, false)}
                onCommit={() => canvia(actual.slug, { preu: actual.preu })}
              />
              <span className="text-suau">€ · {euros(actual.preu)}</span>
            </div>
          </div>

          {actual.suplement && (
            <p className="mt-3 text-[0.88rem]">
              {actual.suplement.nom}: <strong className="font-semibold">+{euros(actual.suplement.preu)}</strong>
            </p>
          )}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="eyebrow text-tinta" id="descripcio-label">
                {t("descripcio")}
              </span>
              <Segmented<Idioma>
                label={t("idioma")}
                value={idioma}
                onChange={setIdioma}
                options={[
                  { value: "ca", label: "CA" },
                  { value: "es", label: "ES" },
                  { value: "en", label: "EN" },
                ]}
              />
            </div>
            <textarea
              aria-labelledby="descripcio-label"
              value={actual.descripcio[idioma]}
              placeholder={t("senseDescripcio")}
              rows={3}
              onChange={(e) => canvia(actual.slug, { descripcio: { ...actual.descripcio, [idioma]: e.target.value } }, false)}
              onBlur={() => canvia(actual.slug, { descripcio: actual.descripcio })}
              className="w-full rounded-2xl border border-linia bg-paper p-3.5 text-[0.92rem] leading-relaxed outline-none focus:border-granat"
            />
            <p className="mt-1 text-[0.78rem] text-suau">{t("nomCatala")}</p>
          </div>

          <dl className="mt-4 space-y-3 border-t border-linia pt-4 text-[0.9rem]">
            <div className="flex justify-between gap-3">
              <dt className="text-suau">{t("temporada")}</dt>
              <dd>{actual.temporada}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <dt className="text-suau">{t("alergens")}</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {actual.alergens.length ? actual.alergens.map((a) => <Etiqueta key={a}>{a}</Etiqueta>) : t("cap")}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-suau">{t("queQueda")}</dt>
              <dd>{actual.queQuedaOk ? t("si") : t("no")}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}

function PreuInput({ centims, onChange, onCommit }: { centims: number; onChange: (c: number) => void; onCommit: () => void }) {
  const [text, setText] = useState((centims / 100).toFixed(2).replace(".", ","));
  return (
    <input
      id="preu"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value.replace(",", "."));
        if (Number.isFinite(v) && v >= 0) onChange(Math.round(v * 100));
      }}
      onBlur={onCommit}
      className="h-11 w-28 rounded-xl border border-linia px-3 text-[0.95rem]"
    />
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-crema px-2 py-0.5 text-[0.72rem] text-suau">{children}</span>;
}

function Interruptor({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="grid min-h-11 min-w-11 place-items-center"
    >
      <span className={cx("relative h-6 w-10 rounded-full transition-colors", on ? "bg-granat" : "bg-linia")}>
        <span
          className={cx(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]",
            on ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
