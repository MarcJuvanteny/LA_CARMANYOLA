import { autoritzat } from "@/lib/sim/auth";
import { serviceClient } from "@/lib/sim/db";
import { nightly } from "@/lib/sim/nightly";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!autoritzat(req)) return Response.json({ error: "no autoritzat" }, { status: 401 });
  const forca = new URL(req.url).searchParams.has("forca");
  return Response.json(await nightly(serviceClient(), new Date(), forca));
}
