import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Client amb la sessió de l'amo: l'RLS decideix què es pot llegir. Mai fa servir claus de servei. */
export async function supabaseServidor() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (llista) => {
        try {
          llista.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Des d'un Server Component no es poden escriure galetes: ho fa el proxy.
        }
      },
    },
  });
}
