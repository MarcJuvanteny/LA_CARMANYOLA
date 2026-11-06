"use client";

import { Fragment, type ComponentProps, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { demanaCampanya, reescriuCampanya, reintentaPeticio } from "@/app/panel/accions-ia";
import { useTranslations } from "next-intl";
import { Isotip } from "@/components/brand/Isotip";
import { usePanelState, type Resolucio } from "@/components/panel/PanelState";
import { AiCard, AiEyebrow, Button, Card, NumberedList, PageHeader, cx } from "@/components/panel/ui";
import type { Campanya, To } from "@/lib/data/campanyes";
import type { Idioma } from "@/lib/data/carta";
import { percent } from "@/lib/format";

interface Props {
  campanyes: Campanya[];
  peticions: { id: number; goal: string }[];
  inicial: string;
  exemple: { nom: string; paraula: string };
}

interface EstatMissatge {
  to: To;
  idioma: Idioma;
  editat: Partial<Record<Idioma, string>>;
  editant: boolean;
  wallet: boolean;
  correu: boolean;
}

const clau = (id: string) => `campanya:${id}`;

export function CampanyesView({ campanyes, peticions, inicial, exemple }: Props) {
  const t = useTranslations("panel.campanyes");
  const { resolts, resol, desfes, pendents } = usePanelState();
  const [seleccio, setSeleccio] = useState(inicial);
  const [missatges, setMissatges] = useState<Record<string, EstatMissatge>>({});
  const [demanant, setDemanant] = useState(false);
  const router = useRouter();
  const [enviant, startTransition] = useTransition();
  const [reescrivint, startReescriu] = useTransition();
  const [errorIA, setErrorIA] = useState<string | null>(null);
  const [reintentant, setReintentant] = useState<number | null>(null);

  const perRevisar = campanyes.filter((c) => c.estat === "esborrany");
  const enviades = campanyes.filter((c) => c.estat === "enviada");
  const actual = campanyes.find((c) => c.id === seleccio) ?? campanyes[0];

  const estatDe = (c: Campanya): Resolucio | "esborrany" | "enviada" =>
    c.estat === "enviada" ? "enviada" : (resolts[clau(c.id)] ?? "esborrany");

  const m: EstatMissatge = missatges[actual.id] ?? {
    to: "original",
    idioma: "ca",
    editat: {},
    editant: false,
    wallet: actual.canals.wallet,
    correu: actual.canals.correu,
  };
  const setM = (patch: Partial<EstatMissatge>) => setMissatges((s) => ({ ...s, [actual.id]: { ...m, ...patch } }));
  const text = m.editat[m.idioma] ?? actual.missatges[m.to][m.idioma];

  const demana = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const objectiu = String(form.get("objectiu") ?? "").trim();
    if (!objectiu) return;
    setErrorIA(null);
    startTransition(async () => {
      const slug = await demanaCampanya(objectiu);
      setDemanant(false);
      if (slug) setSeleccio(slug);
      else setErrorIA(t("iaNoRespon"));
      router.refresh();
    });
  };

  const reintenta = (id: number) => {
    setErrorIA(null);
    setReintentant(id);
    startTransition(async () => {
      const slug = await reintentaPeticio(id);
      setReintentant(null);
      if (slug) setSeleccio(slug);
      else setErrorIA(t("iaNoRespon"));
      router.refresh();
    });
  };

  const reescriu = () => {
    setErrorIA(null);
    startReescriu(async () => {
      const ok = await reescriuCampanya(actual.id);
      if (ok) {
        setMissatges((s) => ({ ...s, [actual.id]: { ...m, to: "original", editat: {}, editant: false } }));
        router.refresh();
      } else setErrorIA(t("iaNoRespon"));
    });
  };

  return (
    <>
      <PageHeader
        title={t("titol")}
        subtitle={t("subtitol")}
        actions={
          <Button onClick={() => setDemanant((v) => !v)} aria-expanded={demanant}>
            <Isotip versio="groc" className="size-4" />
            {t("demana")}
          </Button>
        }
      />

      {demanant && (
        <AiCard className="mb-5">
          <form onSubmit={demana} className="space-y-3">
            <label htmlFor="objectiu" className="eyebrow block text-granat">
              {t("demanaLabel")}
            </label>
            <textarea
              id="objectiu"
              name="objectiu"
              rows={2}
              required
              placeholder={t("demanaPlaceholder")}
              className="w-full rounded-2xl border border-granat/20 bg-white/80 p-3.5 text-[0.95rem] outline-none focus:border-granat"
            />
            <p className="text-[0.82rem]">{t("demanaNota")}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={enviant}>
                {enviant ? t("iaPreparant") : t("demanaEnvia")}
              </Button>
              <Button variant="ghost" onClick={() => setDemanant(false)}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        </AiCard>
      )}

      {errorIA && (
        <p className="mb-5 rounded-2xl bg-rosa-clar p-4 text-sm font-semibold text-granat" role="alert">
          {errorIA}
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* Llista: una línia per campanya, sense caixes. */}
        <nav aria-label={t("titol")} className="space-y-4">
          <Grup titol={t("perRevisar")} n={pendents(perRevisar.map((c) => clau(c.id)))} alerta obert>
            {peticions.map(({ id, goal: d }) => (
              <li key={id} className="rounded-xl border border-dashed border-granat/30 px-3 py-2.5">
                <p className="line-clamp-2 text-[0.92rem]">{d}</p>
                <p className="mt-0.5 text-[0.78rem] text-suau">{t("enPreparacio")}</p>
                <button type="button" className="mt-1 min-h-9 text-[0.82rem] font-medium text-granat underline underline-offset-2" onClick={() => reintenta(id)} disabled={enviant}>
                  {reintentant === id ? t("iaPreparant") : t("reintenta")}
                </button>
              </li>
            ))}
            {perRevisar.map((c) => (
              <ItemLlista key={c.id} c={c} actiu={c.id === actual.id} estat={estatDe(c)} onClick={() => setSeleccio(c.id)} />
            ))}
          </Grup>
          <Grup titol={t("enviades")} n={enviades.length} obert={actual.estat === "enviada"}>
            {enviades.map((c) => (
              <ItemLlista key={c.id} c={c} actiu={c.id === actual.id} estat="enviada" onClick={() => setSeleccio(c.id)} />
            ))}
          </Grup>
        </nav>

        {/* Detall */}
        {actual.estat === "enviada" ? (
          <Resultat c={actual} />
        ) : (
          <Card className="min-w-0 self-start">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AiEyebrow>{t(`tipus.${actual.tipus}`)}</AiEyebrow>
              <span className="text-[0.82rem] text-suau">{t(`estat.${estatDe(actual)}`)}</span>
            </div>
            <h2 className="mt-2 text-[1.6rem] leading-tight">{actual.titol}</h2>
            <p className="mt-1.5 text-[0.88rem] text-suau">{actual.xips.join(" · ")}</p>

            {/* El "per què" de la IA hi és sempre, però plegat: el protagonista és el missatge. */}
            <details className="group mt-4 rounded-2xl bg-groc px-4 py-3">
              <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-[0.88rem] font-medium text-granat [&::-webkit-details-marker]:hidden">
                <Isotip className="size-4 shrink-0" />
                {t("perQue")}
                <span aria-hidden className="ml-auto transition-transform group-open:rotate-180">
                  ⌄
                </span>
              </summary>
              <NumberedList items={actual.perQue} className="mt-3" />
            </details>

            <div className="mt-6 grid grid-cols-1 gap-8 border-t border-linia pt-6 xl:grid-cols-[1fr_220px]">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="eyebrow text-tinta">{t("missatge")}</p>
                  <div role="group" aria-label={t("idioma")} className="flex gap-1 text-[0.82rem]">
                    {(["ca", "es", "en"] as Idioma[]).map((idioma) => (
                      <button
                        key={idioma}
                        type="button"
                        aria-pressed={m.idioma === idioma}
                        onClick={() => setM({ idioma })}
                        className={cx(
                          "min-h-9 rounded-full px-3 font-medium uppercase",
                          m.idioma === idioma ? "bg-tinta text-white" : "text-suau hover:text-tinta",
                        )}
                      >
                        {idioma}
                      </button>
                    ))}
                  </div>
                </div>

                {m.editant ? (
                  <>
                    <label htmlFor="missatge" className="sr-only">
                      {t("missatge")}
                    </label>
                    <textarea
                      id="missatge"
                      value={text}
                      onChange={(e) => setM({ editat: { ...m.editat, [m.idioma]: e.target.value } })}
                      rows={5}
                      className="w-full rounded-2xl border border-linia bg-paper p-4 text-[0.98rem] leading-relaxed outline-none focus:border-granat"
                    />
                    <p className="mt-1 text-[0.78rem] text-suau">{t("variables")}</p>
                  </>
                ) : (
                  <p className="min-h-32 rounded-2xl bg-paper p-4 text-[0.98rem] leading-relaxed">
                    <Variables text={text} />
                  </p>
                )}

                {/* Eines del missatge: discretes, sota el text. */}
                <div className="mt-2 flex flex-wrap items-center gap-1 text-[0.82rem]">
                  {(["curt", "calid", "senseExtra"] as To[]).map((to) => (
                    <Eina key={to} actiu={m.to === to} onClick={() => setM({ to: m.to === to ? "original" : to, editat: {} })}>
                      {to === "senseExtra" ? (actual.senseExtra ?? t("to.senseExtra")) : t(`to.${to}`)}
                    </Eina>
                  ))}
                  <span aria-hidden className="mx-1 h-4 w-px bg-linia" />
                  <Eina actiu={m.editant} onClick={() => setM({ editant: !m.editant })}>
                    {m.editant ? t("fetEdicio") : t("editaMa")}
                  </Eina>
                  {estatDe(actual) === "esborrany" && (
                    <Eina onClick={reescriu} disabled={reescrivint}>
                      <Isotip className="size-3.5" />
                      {reescrivint ? t("iaEscrivint") : t("iaReescriu")}
                    </Eina>
                  )}
                </div>

                <dl className="mt-6 space-y-3 border-t border-linia pt-5 text-[0.9rem]">
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <dt className="eyebrow w-16 shrink-0 pt-2.5 text-suau">{t("perOn")}</dt>
                    <dd className="flex flex-wrap gap-x-5">
                      <Check checked={m.wallet} onChange={(wallet) => setM({ wallet })} label={t("walletCurt")} />
                      <Check checked={m.correu} onChange={(correu) => setM({ correu })} label={t("correuCurt", { n: actual.canals.correuAcceptat })} />
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <dt className="eyebrow w-16 shrink-0 pt-0.5 text-suau">{t("quan")}</dt>
                    <dd>
                      {actual.quan.text} <span className="text-suau">{actual.quan.motiu}</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <Telefon
                data={actual.previsualitzacio.data}
                hora={actual.previsualitzacio.hora}
                text={omple(text, exemple)}
                etiqueta={t("previsualitzacio")}
                ara={t("ara")}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-linia pt-5">
              <Accions
                estat={estatDe(actual)}
                quan={actual.quan.text}
                senseCanal={!m.wallet && !m.correu}
                desat={resolts[clau(actual.id)] === "esborrany"}
                onResol={(r) => resol(clau(actual.id), r, { editat: m.editat, wallet: m.wallet, correu: m.correu })}
                onDesfes={() => desfes(clau(actual.id))}
              />
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function Eina({ actiu, className, children, ...rest }: ComponentProps<"button"> & { actiu?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={actiu}
      className={cx(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 font-medium transition-colors disabled:opacity-50",
        actiu ? "bg-tinta text-white" : "text-suau hover:bg-paper hover:text-tinta",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Grup plegable de la llista. `alerta`: el comptador en granat, perquè són coses pendents. */
function Grup({ titol, n, alerta, obert, children }: { titol: string; n: number; alerta?: boolean; obert?: boolean; children: React.ReactNode }) {
  return (
    <details open={obert} className="group/grup">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 hover:bg-white/70 [&::-webkit-details-marker]:hidden">
        <h2 className="eyebrow font-cos text-suau">{titol}</h2>
        {n > 0 && (
          <span
            className={cx(
              "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-semibold tabular-nums",
              alerta ? "bg-granat text-white" : "bg-crema text-suau",
            )}
          >
            {n}
          </span>
        )}
        <span aria-hidden className="ml-auto text-suau transition-transform group-open/grup:rotate-180">
          ⌄
        </span>
      </summary>
      <ul className="mt-1 space-y-1">{children}</ul>
    </details>
  );
}

function ItemLlista({
  c,
  actiu,
  estat,
  onClick,
}: {
  c: Campanya;
  actiu: boolean;
  estat: string;
  onClick: () => void;
}) {
  const t = useTranslations("panel.campanyes");
  const ia = c.estat === "esborrany";
  const detall = c.resultat
    ? t("resum", { clients: c.resultat.clients, tornat: percent(c.resultat.tornat) })
    : estat === "esborrany"
      ? c.proposada
      : t(`estat.${estat}`);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={actiu ? "true" : undefined}
        className={cx(
          "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
          actiu && ia && "bg-groc",
          actiu && !ia && "bg-white",
          !actiu && "hover:bg-white/70",
          (estat === "descartada" || estat === "ara-no") && "opacity-55",
        )}
      >
        <p className="flex items-start gap-2 text-[0.94rem] leading-snug font-medium">
          {/* Punt granat: pendent de revisar. */}
          {estat === "esborrany" && <span aria-hidden className="mt-[0.4em] size-2 shrink-0 rounded-full bg-granat" />}
          <span className="line-clamp-2">{c.titol}</span>
          {estat === "esborrany" && <span className="sr-only"> · {t("estat.esborrany")}</span>}
        </p>
        <p className={cx("mt-0.5 text-[0.78rem] text-suau", estat === "esborrany" && "pl-4")}>
          {t(`tipus.${c.tipus}`)} · {detall}
        </p>
      </button>
    </li>
  );
}

function Accions({
  estat,
  quan,
  senseCanal,
  desat,
  onResol,
  onDesfes,
}: {
  estat: string;
  desat: boolean;
  quan: string;
  senseCanal: boolean;
  onResol: (r: Resolucio) => void;
  onDesfes: () => void;
}) {
  const t = useTranslations("panel.campanyes");
  if (estat === "aprovada" || estat === "descartada" || estat === "ara-no") {
    return (
      <p className="mr-auto flex flex-wrap items-center gap-3 text-sm" role="status">
        <span className="font-semibold">{estat === "aprovada" ? t("programada", { quan }) : t(`estat.${estat}`)}</span>
        <button type="button" className="min-h-11 underline" onClick={onDesfes}>
          {t("desfes")}
        </button>
      </p>
    );
  }
  return (
    <>
      {desat && (
        <span className="mr-auto text-sm text-suau" role="status">
          {t("desat")}
        </span>
      )}
      <Button variant="outline" onClick={() => onResol("descartada")}>
        {t("descarta")}
      </Button>
      <Button variant="outline" onClick={() => onResol("esborrany")}>
        {t("desa")}
      </Button>
      <Button onClick={() => onResol("aprovada")} disabled={senseCanal} title={senseCanal ? t("triaCanal") : undefined}>
        {t("aprova")}
      </Button>
    </>
  );
}

function Resultat({ c }: { c: Campanya }) {
  const t = useTranslations("panel.campanyes");
  const r = c.resultat!;
  return (
    <Card className="min-w-0 self-start">
      <p className="eyebrow text-granat">{t(`tipus.${c.tipus}`)}</p>
      <h2 className="mt-2 text-[1.6rem] leading-tight">{c.titol}</h2>
      <p className="mt-1.5 text-[0.88rem] text-suau">{c.proposada}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Xifra label={t("destinataris")} valor={String(r.clients)} />
        <Xifra label={t("hanTornat")} valor={percent(r.tornat)} />
        <Xifra label={t("control")} valor={percent(r.control)} />
      </div>

      <p className="mt-3 text-[0.8rem] text-suau">{t("atribucio")}</p>

      <div className="mt-6 border-t border-linia pt-5">
        <p className="eyebrow mb-2 text-suau">{t("enviat")}</p>
        <p className="rounded-2xl bg-paper p-4 leading-relaxed">
          <Variables text={c.missatges.original.ca} />
        </p>
      </div>
    </Card>
  );
}

function Xifra({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <p className="eyebrow text-suau">{label}</p>
      <p className="font-titol mt-1 text-[1.8rem] leading-none">{valor}</p>
    </div>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-granat"
      />
      {label}
    </label>
  );
}

/** Mostra {nom} i {paraula} com a variables destacades. */
function Variables({ text }: { text: string }) {
  const t = useTranslations("panel.campanyes");
  const parts = text.split(/(\{nom\}|\{paraula\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p === "{nom}" || p === "{paraula}" ? (
          <span key={i} className="mx-0.5 rounded-md bg-white px-1.5 py-0.5 text-[0.88em] font-medium text-granat">
            {t(p === "{nom}" ? "varNom" : "varParaula")}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const omple = (text: string, e: { nom: string; paraula: string }) =>
  text.replaceAll("{nom}", e.nom).replaceAll("{paraula}", e.paraula);

function Telefon({ data, hora, text, etiqueta, ara }: { data: string; hora: string; text: string; etiqueta: string; ara: string }) {
  return (
    <figure className="mx-auto w-full max-w-[220px]">
      <figcaption className="sr-only">{etiqueta}</figcaption>
      <div className="textura-granat rounded-[2.2rem] border-[6px] border-tinta px-4 pt-9 pb-10 text-center">
        <p className="text-[0.8rem] text-groc">{data}</p>
        <p className="font-titol text-[3.2rem] leading-none text-groc">{hora}</p>
        <div className="mt-10 rounded-2xl bg-paper/95 p-3 text-left">
          <div className="flex items-start gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-groc">
              <Isotip className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex justify-between text-[0.68rem] font-semibold tracking-wide uppercase">
                La Carmanyola <span className="font-normal normal-case text-suau">{ara}</span>
              </p>
              <p className="mt-0.5 line-clamp-6 text-[0.75rem] leading-snug">{text}</p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
