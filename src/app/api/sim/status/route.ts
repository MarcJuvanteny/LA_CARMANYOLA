import { serviceClient } from "@/lib/sim/db";
import { estat } from "@/lib/sim/status";

// Pública: només agregats (obert, servei, comptadors, últim tic).
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await estat(serviceClient()), { headers: { "Cache-Control": "no-store" } });
}
