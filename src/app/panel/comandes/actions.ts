"use server";

import { revalidatePath } from "next/cache";
import { nouCodiQr } from "@/lib/comandes/comandes";
import { supabaseServidor } from "@/lib/supabase/server";

/** Una comanda del local (pagada al taulell): només cal la faixa amb el QR perquè sumi la paraula. */
export async function faixaLocal(nom: string) {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Cal entrar al panell");
  const { data, error } = await supabase
    .from("orders")
    .insert({ channel: "local", status: "confirmada", customer_name: nom.trim().slice(0, 60) || null, qr_code: nouCodiQr(), paid_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/panel/comandes");
  return data.id as string;
}
