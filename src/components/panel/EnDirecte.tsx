"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

/**
 * Escolta Supabase Realtime: cada comanda nova (o canvi de producció o de campanya)
 * torna a demanar les dades del servidor. Les xifres sempre surten de SQL.
 */

interface Estat {
  connectat: boolean;
  ultima: Date | null;
}

let estatGlobal: Estat = { connectat: false, ultima: null };
const subscriptors = new Set<(e: Estat) => void>();
const publica = (e: Partial<Estat>) => {
  estatGlobal = { ...estatGlobal, ...e };
  subscriptors.forEach((f) => f(estatGlobal));
};

export function useEstatEnDirecte() {
  const [e, setE] = useState(estatGlobal);
  useEffect(() => {
    subscriptors.add(setE);
    return () => void subscriptors.delete(setE);
  }, []);
  return e;
}

export function EnDirecte() {
  const router = useRouter();
  const temporitzador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = supabaseNavegador();
    // Agrupa les ràfegues: com a màxim un refresc cada 0,8 s.
    const refresca = () => {
      if (temporitzador.current) return;
      temporitzador.current = setTimeout(() => {
        temporitzador.current = null;
        router.refresh();
      }, 800);
    };

    const taules = [
      "order_items", "customers", "stamps", "dishes", "ingredients", "ingredient_alerts", "campaigns",
      "campaign_recipients", "campaign_requests", "leftovers", "que_queda_alerts", "production_plans", "brand_voice",
    ];
    let actiu = true;
    let canal = supabase.channel("panell").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
      if (p.eventType === "INSERT") publica({ ultima: new Date((p.new as { created_at: string }).created_at) });
      refresca();
    });
    for (const table of taules) {
      canal = canal.on("postgres_changes", { event: "*", schema: "public", table }, refresca);
    }
    // Realtime aplica l'RLS: cal entrar-hi amb el token de l'amo abans de subscriure's.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!actiu || !session) return;
      await supabase.realtime.setAuth(session.access_token);
      canal.subscribe((status) => publica({ connectat: status === "SUBSCRIBED" }));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      actiu = false;
      subscription.unsubscribe();
      if (temporitzador.current) clearTimeout(temporitzador.current);
      supabase.removeChannel(canal);
    };
  }, [router]);

  return null;
}

