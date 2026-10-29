/**
 * npm run amo -- <correu>
 *
 * Crea (o actualitza) l'usuari amo del panell al projecte de .env.local.
 * La contrasenya es demana a la terminal i no es mostra ni es desa enlloc.
 */

import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Ús: npm run amo -- correu@exemple.com");
  process.exit(1);
}

function demanaContrasenya(pregunta: string): Promise<string> {
  let silenci = false;
  const sortida = new Writable({
    write(chunk, _enc, cb) {
      if (!silenci) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output: sortida, terminal: true });
  return new Promise((resol) => {
    rl.question(pregunta, (resposta) => {
      rl.close();
      process.stdout.write("\n");
      resol(resposta);
    });
    silenci = true;
  });
}

async function main() {
  const contrasenya = await demanaContrasenya(`Contrasenya per a ${email} (no es veurà mentre escrius): `);
  if (contrasenya.length < 10) throw new Error("La contrasenya ha de tenir com a mínim 10 caràcters.");
  const repeteix = await demanaContrasenya("Repeteix-la: ");
  if (repeteix !== contrasenya) throw new Error("Les contrasenyes no coincideixen.");

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: llista, error: e1 } = await admin.auth.admin.listUsers();
  if (e1) throw e1;
  let user = llista.users.find((u) => u.email === email);
  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: contrasenya, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password: contrasenya, email_confirm: true });
    if (error) throw error;
    user = data.user!;
  }

  const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
  await sql`insert into public.owners (user_id) values (${user.id}) on conflict do nothing`;
  await sql.end();
  console.log(`✓ ${email} ja és l'amo del panell.`);
}

main().catch((e) => {
  console.error("Error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
