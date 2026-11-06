"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { actualitzaPlat, creaPlat, type CanvisPlat } from "@/app/panel/actions";
import { Button, Card, CardTitle, PageHeader, Pill, Segmented, cx } from "@/components/panel/ui";
import { ALERGENS, temporades, type Idioma, type Plat, type Seccio, type Temporada } from "@/lib/data/carta";
import { euros } from "@/lib/format";
import { Finestra } from "@/components/panel/Finestra";
import { QueQueda, type DadesQueQueda } from "./QueQueda";

interface Props {
  plats: Plat[];
  seccions: Seccio[];
  suplementDinar: number;
  queQueda: DadesQueQueda;
}

const camp = "w-full rounded-xl border border-linia bg-white px-3 text-[0.95rem] outline-none focus:border-granat";

/** Del model de la pantalla a les columnes de `dishes`. */
function aBaseDeDades(p: Partial<Plat>): Partial<CanvisPlat> {
  return {
    ...(p.nom !== undefined && { name: p.nom }),
    ...(p.seccio !== undefined && { section: p.seccio }),
    ...(p.temporada !== undefined && { season: p.temporada }),
    ...(p.alergens !== undefined && { allergens: p.alergens }),
    ...(p.disponible !== undefined && { available: p.disponible }),
    ...(p.preu !== undefined && { price_cents: p.preu }),
    ...(p.descripcio !== undefined && { description: p.descripcio }),
    ...(p.arxivat !== undefined && { archived: p.arxivat }),
  };
}

export function CartaView({ plats: inicials, seccions, suplementDinar, queQueda }: Props) {
  const t = useTranslations("panel.carta");
  const router = useRouter();
  const [plats, setPlats] = useState(inicials);
  const actius = plats.filter((p) => !p.arxivat);
  const arxivats = plats.filter((p) => p.arxivat);
  const [obert, setObert] = useState<string | null>(null);
  const actual = actius.find((p) => p.slug === obert);
  const [error, setError] = useState(false);
  // El que s'està escrivint (nom, preu, descripció) es desa en sortir del camp o en tancar la fitxa.
  const pendents = useRef<Record<string, Partial<Plat>>>({});
  const [afegint, setAfegint] = useState(false);
  const [creant, startCrea] = useTransition();

  const desa = (slug: string, patch: Partial<Plat>) => {
    const tot = { ...pendents.current[slug], ...patch };
    delete pendents.current[slug];
    if (tot.nom !== undefined && !tot.nom.trim()) delete tot.nom;
    if (!Object.keys(tot).length) return;
    setError(false);
    actualitzaPlat(slug, aBaseDeDades(tot)).catch(() => setError(true));
  };

  const canvia = (slug: string, patch: Partial<Plat>, ara = true) => {
    setPlats((ps) => ps.map((p) => (p.slug === slug ? { ...p, ...patch, ...(patch.arxivat ? { disponible: false } : {}) } : p)));
    if (ara) desa(slug, patch);
    else pendents.current[slug] = { ...pendents.current[slug], ...patch };
  };

  const tanca = () => {
    if (obert) desa(obert, {});
    setObert(null);
  };

  const crea = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nom = String(form.get("nom") ?? "").trim();
    const seccio = String(form.get("seccio")) as Seccio;
    if (!nom) return;
    setError(false);
    startCrea(async () => {
      try {
        const slug = await creaPlat(nom, seccio);
        setPlats((ps) => [
          ...ps,
          { slug, nom, seccio, preu: 0, temporada: "tot l'any", etiquetes: [], alergens: [], queQuedaOk: seccio === "casa", disponible: false, descripcio: { ca: "", es: "", en: "" } },
        ]);
        setObert(slug);
        setAfegint(false);
        router.refresh();
      } catch {
        setError(true);
      }
    });
  };

  return (
    <>
      <PageHeader
        title={t("titol")}
        subtitle={t("subtitol", { n: actius.filter((p) => p.disponible).length, total: actius.length })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Pill>{t("dinar", { preu: euros(suplementDinar) })}</Pill>
            <Button onClick={() => setAfegint((v) => !v)} aria-expanded={afegint}>
              {t("afegeix")}
            </Button>
          </div>
        }
      />

      <QueQueda {...queQueda} />

      {afegint && (
        <Card className="mb-5">
          <form onSubmit={crea} className="flex flex-wrap items-end gap-3">
            <label className="min-w-[200px] flex-1">
              <span className="eyebrow mb-1.5 block text-suau">{t("nom")}</span>
              <input name="nom" required maxLength={60} autoFocus placeholder={t("nomPlaceholder")} className={cx(camp, "h-11")} />
            </label>
            <label>
              <span className="eyebrow mb-1.5 block text-suau">{t("seccioLabel")}</span>
              <select name="seccio" defaultValue="casa" className={cx(camp, "h-11")}>
                {seccions.map((s) => (
                  <option key={s} value={s}>
                    {t(`seccio.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={creant}>
              {creant ? t("creant") : t("crea")}
            </Button>
            <Button variant="ghost" onClick={() => setAfegint(false)}>
              {t("cancel")}
            </Button>
            <p className="w-full text-[0.8rem] text-suau">{t("nouNota")}</p>
          </form>
        </Card>
      )}

      {error && (
        <p role="alert" className="mb-5 rounded-2xl bg-rosa-clar p-4 text-sm font-semibold text-granat">
          {t("errorDesa")}
        </p>
      )}

      <Card>
          {seccions.map((s, idx) => {
            const llista = actius.filter((p) => p.seccio === s);
            if (!llista.length) return null;
            return (
              <section key={s} className={cx(idx > 0 && "mt-7")}>
                <div className="flex items-end justify-between gap-3">
                  <CardTitle as="h2">{t(`seccio.${s}`)}</CardTitle>
                  <span className="eyebrow hidden text-suau sm:block" aria-hidden>
                    {t("aLaVenda")}
                  </span>
                </div>
                <ul className="mt-2">
                  {llista.map((p) => (
                    <li
                      key={p.slug}
                      className={cx(
                        "group/fila -mx-2 flex items-center justify-between gap-4 rounded-xl border-t border-linia px-2 py-1.5 hover:bg-paper",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setObert(p.slug)}
                        aria-haspopup="dialog"
                        aria-label={t("editaPlat", { plat: p.nom })}
                        className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-left"
                      >
                        <span className={cx("font-medium", !p.disponible && "text-suau")}>{p.nom}</span>
                        {p.temporada !== "tot l'any" && <Etiqueta>{t(`temporades.${p.temporada}`)}</Etiqueta>}
                        {p.etiquetes.map((e) => (
                          <Etiqueta key={e}>{e}</Etiqueta>
                        ))}
                        <span aria-hidden className="text-[0.8rem] text-suau opacity-0 transition-opacity group-hover/fila:opacity-100">
                          ✎
                        </span>
                      </button>
                      <span className="flex items-center gap-4">
                        <span className={cx("w-16 text-right text-[0.92rem] tabular-nums", !p.disponible && "text-suau")}>{euros(p.preu)}</span>
                        <Interruptor on={p.disponible} onChange={(disponible) => canvia(p.slug, { disponible })} label={t("aLaVendaPlat", { plat: p.nom })} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {arxivats.length > 0 && (
            <details className="group mt-8 border-t border-linia pt-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[0.9rem] font-medium text-suau [&::-webkit-details-marker]:hidden">
                {t("arxivats", { n: arxivats.length })}
                <span aria-hidden className="transition-transform group-open:rotate-180">
                  ⌄
                </span>
              </summary>
              <ul className="mt-1">
                {arxivats.map((p) => (
                  <li key={p.slug} className="flex items-center justify-between gap-3 border-t border-linia py-2 text-[0.92rem] text-suau">
                    <span>
                      {p.nom} · {t(`seccio.${p.seccio}`)}
                    </span>
                    <button type="button" className="min-h-11 font-medium text-granat underline underline-offset-2" onClick={() => canvia(p.slug, { arxivat: false })}>
                      {t("recupera")}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <p className="mt-6 text-[0.82rem] text-suau">{t("nota")}</p>
      </Card>

      <Finestra obert={!!actual} titol={actual?.nom ?? ""} onTanca={tanca}>
        {actual && (
          <Fitxa
            key={actual.slug}
            plat={actual}
            seccions={seccions}
            onCanvi={(patch, ara) => canvia(actual.slug, patch, ara)}
            onFet={tanca}
            onArxiva={() => {
              canvia(actual.slug, { arxivat: true });
              setObert(null);
            }}
          />
        )}
      </Finestra>
    </>
  );
}

function Fitxa({
  plat,
  seccions,
  onCanvi,
  onFet,
  onArxiva,
}: {
  plat: Plat;
  seccions: Seccio[];
  onCanvi: (patch: Partial<Plat>, ara?: boolean) => void;
  onFet: () => void;
  onArxiva: () => void;
}) {
  const t = useTranslations("panel.carta");
  const [idioma, setIdioma] = useState<Idioma>("ca");
  const [confirma, setConfirma] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <Camp label={t("nom")} id="nom" nota={t("nomCatala")}>
          <input
            id="nom"
            value={plat.nom}
            maxLength={60}
            onChange={(e) => onCanvi({ nom: e.target.value }, false)}
            onBlur={() => onCanvi({ nom: plat.nom })}
            className={cx(camp, "h-11 font-medium")}
          />
        </Camp>

        <div className="grid grid-cols-2 gap-3">
          <Camp label={t("preu")} id="preu">
            <PreuInput centims={plat.preu} onChange={(preu) => onCanvi({ preu }, false)} onCommit={() => onCanvi({ preu: plat.preu })} />
          </Camp>
          <Camp label={t("temporada")} id="temporada">
            <select id="temporada" value={plat.temporada} onChange={(e) => onCanvi({ temporada: e.target.value as Temporada })} className={cx(camp, "h-11")}>
              {temporades.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`temporades.${tp}`)}
                </option>
              ))}
            </select>
          </Camp>
        </div>

        <Camp label={t("seccioLabel")} id="seccio">
          <select id="seccio" value={plat.seccio} onChange={(e) => onCanvi({ seccio: e.target.value as Seccio })} className={cx(camp, "h-11")}>
            {seccions.map((s) => (
              <option key={s} value={s}>
                {t(`seccio.${s}`)}
              </option>
            ))}
          </select>
        </Camp>

        {plat.suplement && (
          <p className="text-[0.88rem]">
            {plat.suplement.nom}: <strong className="font-semibold">+{euros(plat.suplement.preu)}</strong>
          </p>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="eyebrow text-suau" id="descripcio-label">
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
            value={plat.descripcio[idioma]}
            placeholder={t("senseDescripcio")}
            rows={3}
            onChange={(e) => onCanvi({ descripcio: { ...plat.descripcio, [idioma]: e.target.value } }, false)}
            onBlur={() => onCanvi({ descripcio: plat.descripcio })}
            className={cx(camp, "p-3 leading-relaxed")}
          />
        </div>

        <fieldset>
          <legend className="eyebrow mb-2 text-suau">{t("alergens")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {ALERGENS.map((a) => {
              const on = plat.alergens.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onCanvi({ alergens: on ? plat.alergens.filter((x) => x !== a) : [...plat.alergens, a] })}
                  className={cx(
                    "min-h-9 rounded-full border px-3 text-[0.8rem] transition-colors",
                    on ? "border-tinta bg-tinta text-white" : "border-linia text-suau hover:border-tinta/40 hover:text-tinta",
                  )}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-linia pt-4">
        {confirma ? (
          <div className="flex flex-wrap items-center gap-2" role="alert">
            <p className="w-full text-[0.85rem]">{t("arxivaPregunta", { plat: plat.nom })}</p>
            <Button onClick={onArxiva}>{t("arxivaSi")}</Button>
            <Button variant="ghost" onClick={() => setConfirma(false)}>
              {t("cancel")}
            </Button>
          </div>
        ) : (
          <>
            <button type="button" className="min-h-11 text-[0.88rem] font-medium text-suau underline underline-offset-2 hover:text-granat" onClick={() => setConfirma(true)}>
              {t("arxiva")}
            </button>
            <Button onClick={onFet}>{t("fet")}</Button>
          </>
        )}
      </div>
    </>
  );
}

function Camp({ label, id, nota, children }: { label: string; id: string; nota?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-1.5 block text-suau">
        {label}
      </label>
      {children}
      {nota && <p className="mt-1 text-[0.78rem] text-suau">{nota}</p>}
    </div>
  );
}

function PreuInput({ centims, onChange, onCommit }: { centims: number; onChange: (c: number) => void; onCommit: () => void }) {
  const [text, setText] = useState((centims / 100).toFixed(2).replace(".", ","));
  return (
    <div className="relative">
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
        className={cx(camp, "h-11 pr-8 tabular-nums")}
      />
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-suau">
        €
      </span>
    </div>
  );
}

function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-crema px-2 py-0.5 text-[0.72rem] text-suau">{children}</span>;
}

function Interruptor({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="grid min-h-11 min-w-11 place-items-center">
      <span className={cx("relative h-6 w-10 rounded-full transition-colors", on ? "bg-granat" : "bg-linia")}>
        <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]", on ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}
