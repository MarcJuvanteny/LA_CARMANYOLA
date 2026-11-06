"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SUPLEMENT_DINAR } from "@/lib/data/carta";

/* La cistella viu al navegador (localStorage). En pagar, el servidor crea la comanda i en posa els preus. */

export interface Linia {
  /** slug, o slug+dinar quan és El Dinar */
  id: string;
  slug: string;
  nom: string;
  preu: number;
  quantitat: number;
  dinar?: { slug: string; nom: string };
  /** El que porta un Fes-te'l tu (per llegir) */
  detall?: string;
  /** Fes-te'l tu: els ids dels ingredients, per al servidor */
  opcions?: string[];
}

const CLAU = "carmanyola:cistella";
const CLAU_CARNET = "carmanyola:carnet-mobil";

export const preuLinia = (l: Linia) => (l.preu + (l.dinar ? SUPLEMENT_DINAR : 0)) * l.quantitat;

function llegeix<T>(clau: string, perDefecte: T): T {
  try {
    const v = localStorage.getItem(clau);
    return v ? (JSON.parse(v) as T) : perDefecte;
  } catch {
    return perDefecte;
  }
}

function escriu(clau: string, valor: unknown) {
  try {
    localStorage.setItem(clau, JSON.stringify(valor));
  } catch {
    // Navegació privada o emmagatzematge ple: la cistella dura fins que es tanca la pestanya.
  }
}

interface Estat {
  /** Fals fins que s'ha llegit el localStorage. */
  llesta: boolean;
  linies: Linia[];
  unitats: number;
  total: number;
  /** Puja cada vegada que s'afegeix alguna cosa: fa botar la icona de la cistella. */
  bot: number;
  afegeix: (l: Omit<Linia, "id" | "quantitat">, quantitat?: number) => void;
  canvia: (id: string, quantitat: number) => void;
  /** Buida la cistella (quan la comanda ja és pagada) */
  buida: () => void;
  /** El calaix lateral de la comanda: s'obre a sobre de la pàgina, sense canviar-ne. */
  obert: boolean;
  obre: () => void;
  tanca: () => void;
}

const Context = createContext<Estat | null>(null);

export function CistellaProvider({ children }: { children: React.ReactNode }) {
  const [linies, setLinies] = useState<Linia[]>([]);
  const [llesta, setLlesta] = useState(false);
  const [bot, setBot] = useState(0);
  const [obert, setObert] = useState(false);
  const obre = useCallback(() => setObert(true), []);
  const tanca = useCallback(() => setObert(false), []);

  useEffect(() => {
    // L'emmagatzematge només existeix al navegador: es llegeix després d'hidratar.
    setLinies(llegeix<Linia[]>(CLAU, []));
    setLlesta(true);
  }, []);

  useEffect(() => {
    if (llesta) escriu(CLAU, linies);
  }, [linies, llesta]);

  const afegeix = useCallback<Estat["afegeix"]>((l, quantitat = 1) => {
    const id = [l.slug, l.dinar?.slug, l.detall].filter(Boolean).join("+");
    setLinies((ls) =>
      ls.some((x) => x.id === id)
        ? ls.map((x) => (x.id === id ? { ...x, quantitat: x.quantitat + quantitat } : x))
        : [...ls, { ...l, id, quantitat }],
    );
    setBot((b) => b + 1);
  }, []);

  const canvia = useCallback<Estat["canvia"]>((id, quantitat) => {
    setLinies((ls) => (quantitat <= 0 ? ls.filter((x) => x.id !== id) : ls.map((x) => (x.id === id ? { ...x, quantitat } : x))));
  }, []);

  const buida = useCallback(() => setLinies([]), []);

  const valor = useMemo<Estat>(
    () => ({
      llesta,
      linies,
      unitats: linies.reduce((s, l) => s + l.quantitat, 0),
      total: linies.reduce((s, l) => s + preuLinia(l), 0),
      bot,
      afegeix,
      canvia,
      buida,
      obert,
      obre,
      tanca,
    }),
    [llesta, linies, bot, afegeix, canvia, buida, obert, obre, tanca],
  );

  return <Context.Provider value={valor}>{children}</Context.Provider>;
}

export function useCistella() {
  const c = useContext(Context);
  if (!c) throw new Error("useCistella fora de CistellaProvider");
  return c;
}

/** El mòbil del carnet d'aquest dispositiu: es recorda per sumar paraules sense tornar-lo a escriure. */
export const mobilCarnet = () => llegeix<string>(CLAU_CARNET, "");
export const recordaMobilCarnet = (mobil: string) => escriu(CLAU_CARNET, mobil);
