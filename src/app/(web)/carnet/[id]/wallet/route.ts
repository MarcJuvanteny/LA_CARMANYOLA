import { userAgent, type NextRequest } from "next/server";
import { carnet } from "@/lib/wallet/carnet";
import { appleConfigurat, passApple } from "@/lib/wallet/apple";
import { enllacGoogle, googleConfigurat } from "@/lib/wallet/google";

// Destí del QR del carnet: l'iPhone rep el .pkpass i l'Android l'enllaç de Google Wallet,
// sense passar per cap pàgina. Sense claus (o des d'un ordinador), la pàgina del carnet.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, ctx: RouteContext<"/carnet/[id]/wallet">) {
  const { id } = await ctx.params;
  const c = await carnet(id);
  if (!c) return new Response(null, { status: 404 });

  const so = userAgent(request).os.name ?? "";
  const quin = request.nextUrl.searchParams.get("a") ?? (/ios/i.test(so) ? "apple" : /android/i.test(so) ? "google" : "");

  if (quin === "apple" && appleConfigurat()) {
    return new Response(new Uint8Array(await passApple(c)), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="carnet-carmanyola.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (quin === "google" && googleConfigurat()) {
    return Response.redirect(enllacGoogle(c, request.nextUrl.origin), 302);
  }
  return Response.redirect(new URL(`/carnet/${id}`, request.url), 302);
}
