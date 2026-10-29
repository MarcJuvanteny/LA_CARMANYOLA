"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Imagotip } from "@/components/brand/Imagotip";
import { Isotip } from "@/components/brand/Isotip";
import { posaAlDia } from "@/app/panel/actions";
import { surt } from "@/app/entra/actions";
import { hora } from "@/lib/dates";
import { useEstatEnDirecte } from "./EnDirecte";
import { PROPOSTES, usePanelState } from "./PanelState";
import { Badge, Pill, cx } from "./ui";

const items = [
  { href: "/panel", key: "resum" },
  { href: "/panel/vendes", key: "vendes" },
  { href: "/panel/clients", key: "clients" },
  { href: "/panel/franges", key: "franges" },
  { href: "/panel/campanyes", key: "campanyes", badge: PROPOSTES.campanyes },
  { href: "/panel/que-queda", key: "queQueda" },
  { href: "/panel/padro", key: "padro", badge: PROPOSTES.padro },
  { href: "/panel/carta", key: "carta" },
  { href: "/panel/veu-de-marca", key: "veu" },
] as const;

export function Sidebar() {
  const t = useTranslations("panel.nav");
  const pathname = usePathname();
  const { pendents } = usePanelState();
  const [obert, setObert] = useState(false);
  const directe = useEstatEnDirecte();
  const [simulant, startTransition] = useTransition();

  useEffect(() => setObert(false), [pathname]);

  const nav = (
    <nav aria-label={t("label")}>
      <ul className="space-y-1">
        {items.map((it) => {
          const actiu = it.href === "/panel" ? pathname === "/panel" : pathname.startsWith(it.href);
          const n = "badge" in it ? pendents(it.badge) : 0;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={actiu ? "page" : undefined}
                className={cx(
                  "flex min-h-11 items-center justify-between rounded-xl px-3 text-[0.95rem] transition-colors",
                  actiu ? "bg-granat font-semibold text-groc" : "text-tinta hover:bg-crema",
                )}
              >
                {t(it.key)}
                {n > 0 && (
                  <Badge>
                    {n}
                    <span className="sr-only"> {t("perRevisar")}</span>
                  </Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const peu = (
    <div className="space-y-3">
      <div className="flex gap-3 rounded-2xl bg-crema p-3.5 text-[0.8rem] leading-snug">
        <Isotip className="mt-0.5 size-6 shrink-0" />
        <p>
          {t.rich("revisio", {
            hora: "6:00",
            n: pendents(),
            b: (chunks) => <strong className="font-semibold">{chunks}</strong>,
          })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill dashed>{t("simulades")}</Pill>
        <span className="flex items-center gap-1.5 text-[0.75rem] text-suau" role="status">
          <span aria-hidden className={cx("size-2 rounded-full", directe.connectat ? "bg-granat animate-pulse" : "bg-linia")} />
          {directe.connectat ? t("enDirecte") : t("desconnectat")}
          {directe.ultima && ` · ${t("ultima", { hora: hora(directe.ultima) })}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4">
        <button
          type="button"
          disabled={simulant}
          onClick={() => startTransition(async () => void (await posaAlDia()))}
          className="min-h-11 text-[0.8rem] font-semibold text-granat underline-offset-2 hover:underline disabled:opacity-50"
        >
          {simulant ? t("simulant") : t("simula")}
        </button>
        <form action={surt}>
          <button type="submit" className="min-h-11 text-[0.8rem] text-suau underline-offset-2 hover:underline">
            {t("surt")}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mòbil: barra superior + calaix */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-linia bg-white px-4 py-3 lg:hidden">
        <Link href="/panel" className="py-1">
          <Imagotip className="h-6" />
        </Link>
        <button
          type="button"
          onClick={() => setObert((o) => !o)}
          aria-expanded={obert}
          aria-controls="menu-panel"
          className="flex min-h-11 items-center gap-2 rounded-full border border-linia px-4 text-sm font-semibold"
        >
          {obert ? t("tanca") : t("menu")}
          {!obert && pendents() > 0 && <Badge>{pendents()}</Badge>}
        </button>
      </div>
      {obert && (
        <div id="menu-panel" className="fixed inset-x-0 top-[65px] bottom-0 z-20 overflow-y-auto bg-white px-4 py-4 lg:hidden">
          {nav}
          <div className="mt-6">{peu}</div>
        </div>
      )}

      {/* Escriptori */}
      <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col justify-between border-r border-linia bg-white px-4 pt-8 pb-6 lg:flex">
        <div>
          <Link href="/panel" className="mb-9 block px-1 pt-2">
            <Imagotip className="h-[26px]" />
          </Link>
          {nav}
        </div>
        {peu}
      </aside>
    </>
  );
}
