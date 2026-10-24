import { autoritzat } from "@/lib/sim/auth";
import { simulateUntil } from "@/lib/sim/catchup";
import { serviceClient } from "@/lib/sim/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!autoritzat(req)) return Response.json({ error: "no autoritzat" }, { status: 401 });
  return Response.json(await simulateUntil(serviceClient()));
}
