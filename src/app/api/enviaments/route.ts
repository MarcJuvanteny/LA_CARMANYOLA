import { enviaProgramades } from "@/lib/enviaments/enviaments";
import { autoritzat } from "@/lib/sim/auth";

export const dynamic = "force-dynamic";

/** Campanyes aprovades amb hora d'enviament: les crida pg_cron cada 10 minuts (Bearer SIM_SECRET). */
export async function POST(req: Request) {
  if (!autoritzat(req)) return Response.json({ error: "no autoritzat" }, { status: 401 });
  return Response.json({ enviades: await enviaProgramades() });
}
