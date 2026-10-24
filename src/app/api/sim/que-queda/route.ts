import { autoritzat } from "@/lib/sim/auth";
import { serviceClient } from "@/lib/sim/db";
import { calculaQueQueda } from "@/lib/sim/que-queda";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!autoritzat(req)) return Response.json({ error: "no autoritzat" }, { status: 401 });
  const forca = new URL(req.url).searchParams.has("forca");
  return Response.json(await calculaQueQueda(serviceClient(), new Date(), forca));
}
