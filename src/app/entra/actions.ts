"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";

export async function entra(_prev: { error: boolean }, form: FormData) {
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: true };
  const torna = String(form.get("torna") ?? "");
  redirect(torna.startsWith("/panel") ? torna : "/panel");
}

export async function surt() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/entra");
}
