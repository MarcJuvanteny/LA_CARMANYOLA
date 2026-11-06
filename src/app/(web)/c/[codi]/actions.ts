"use server";

import { sumaFaixa, type ResultatFaixa } from "@/lib/comandes/faixa";
import { ipClient } from "@/lib/origen";
import { serviceClient } from "@/lib/sim/db";

export async function suma(codi: string, mobil: string): Promise<ResultatFaixa | { estat: "limit" }> {
  // Límit per IP: ningú pot provar mòbils a l'engròs sobre un codi.
  const { data: ok } = await serviceClient().rpc("limita", { p_clau: `faixa:${await ipClient()}`, p_max: 10, p_segons: 600 });
  if (ok === false) return { estat: "limit" };
  return sumaFaixa(codi, mobil);
}
