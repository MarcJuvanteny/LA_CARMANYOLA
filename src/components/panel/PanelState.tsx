"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { desfesProposta, resolProposta, type PayloadProposta } from "@/app/panel/actions";

/**
 * Estat de les propostes de la IA. Arrenca amb el que diu la base de dades,
 * s'actualitza a l'instant (optimista) i es desa amb una server action.
 */

export type Resolucio = "aprovada" | "descartada" | "esborrany" | "enviada" | "ara-no";

export const PROPOSTES = {
  campanyes: ["campanya:recupera-habituals", "campanya:segell-doble", "campanya:carxofa"],
  padro: ["padro:alta-carxofa", "padro:baixa-tomaquet"],
  queQueda: ["quequeda:avis"],
  vendes: ["vendes:produccio"],
} as const;

const TOTES: string[] = Object.values(PROPOSTES).flat();

interface Ctx {
  resolts: Record<string, Resolucio>;
  resol: (id: string, r: Resolucio, payload?: PayloadProposta) => void;
  desfes: (id: string) => void;
  pendents: (ids?: readonly string[]) => number;
  desant: boolean;
  error: boolean;
}

const PanelCtx = createContext<Ctx | null>(null);

export function PanelStateProvider({ children, inicial }: { children: ReactNode; inicial: Record<string, Resolucio> }) {
  const router = useRouter();
  const [locals, setLocals] = useState<Record<string, Resolucio | null>>({});
  const [desant, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const fets = useRef(new Set<string>());

  // Quan arriben dades noves del servidor, els canvis ja desats deixen de ser optimistes.
  useEffect(() => {
    if (!fets.current.size) return;
    setLocals((s) => Object.fromEntries(Object.entries(s).filter(([k]) => !fets.current.has(k))));
    fets.current.clear();
  }, [inicial]);

  // El que ve del servidor, amb els canvis optimistes a sobre.
  const resolts = useMemo(() => {
    const r: Record<string, Resolucio> = { ...inicial };
    for (const [k, v] of Object.entries(locals)) {
      if (v === null) delete r[k];
      else r[k] = v;
    }
    return r;
  }, [inicial, locals]);

  const executa = useCallback(
    (id: string, valor: Resolucio | null, accio: () => Promise<void>) => {
      setError(false);
      setLocals((s) => ({ ...s, [id]: valor }));
      startTransition(async () => {
        try {
          await accio();
          fets.current.add(id);
          router.refresh();
        } catch {
          setError(true);
          setLocals(({ [id]: _, ...rest }) => rest);
        }
      });
    },
    [router],
  );

  const resol = useCallback(
    (id: string, r: Resolucio, payload?: PayloadProposta) =>
      executa(id, r, () => resolProposta(id, r === "enviada" ? "aprovada" : r, payload)),
    [executa],
  );
  const desfes = useCallback((id: string) => executa(id, null, () => desfesProposta(id)), [executa]);

  // Un esborrany desat continua pendent de revisar.
  const pendents = useCallback(
    (ids: readonly string[] = TOTES) => ids.filter((id) => !resolts[id] || resolts[id] === "esborrany").length,
    [resolts],
  );

  const value = useMemo(() => ({ resolts, resol, desfes, pendents, desant, error }), [resolts, resol, desfes, pendents, desant, error]);
  return <PanelCtx.Provider value={value}>{children}</PanelCtx.Provider>;
}

export function usePanelState() {
  const ctx = useContext(PanelCtx);
  if (!ctx) throw new Error("usePanelState fora de PanelStateProvider");
  return ctx;
}
