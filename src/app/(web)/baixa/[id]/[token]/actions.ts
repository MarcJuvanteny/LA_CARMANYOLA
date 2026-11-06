"use server";

import { donaDeBaixa } from "@/lib/enviaments/enviaments";
import { comprovaSignatura } from "@/lib/signatura";

export async function confirmaBaixa(id: string, token: string) {
  if (!comprovaSignatura("baixa", id, token)) return false;
  await donaDeBaixa(id);
  return true;
}
