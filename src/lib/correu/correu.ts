import "server-only";
import { signa } from "@/lib/signatura";

// Correu amb l'API de Resend (sense SDK).
//   RESEND_API_KEY  re_...
//   CORREU_DES_DE   "La Carmanyola <hola@el-teu-domini.cat>" (domini verificat a Resend)
// Sense clau, no s'envia res: es registra a la consola i es torna `enviat: false`.

export const correuConfigurat = () => !!process.env.RESEND_API_KEY && !!process.env.CORREU_DES_DE;

const escapa = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const enllacBaixa = (origen: string, clientId: string) => `${origen}/baixa/${clientId}/${signa("baixa", clientId)}`;
const enllacBaixaUnClic = (origen: string, clientId: string) => `${origen}/api/baixa?c=${clientId}&t=${signa("baixa", clientId)}`;

const PEU = {
  ca: { baixa: "No vull rebre més avisos", per: "Reps aquest correu perquè tens el carnet de desbowlitzador i vas acceptar els avisos." },
  es: { baixa: "No quiero recibir más avisos", per: "Recibes este correo porque tienes el carnet de desbowlitzador y aceptaste los avisos." },
  en: { baixa: "Stop these emails", per: "You're getting this because you have a desbowlitzador card and agreed to hear from us." },
} as const;

/** Plantilla de marca: paper, granat, molt d'aire. Text pla al costat per als clients de correu que no fan HTML. */
function plantilla(d: { titol: string; cos: string; locale: "ca" | "es" | "en"; origen: string; clientId?: string }) {
  const p = PEU[d.locale];
  const baixa = d.clientId ? enllacBaixa(d.origen, d.clientId) : null;
  const paragrafs = d.cos
    .split(/\n{2,}/)
    .map((x) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#38383A">${escapa(x).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = `<!doctype html><html lang="${d.locale}"><body style="margin:0;background:#F7F2E9;font-family:Archivo,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F2E9"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="background:#77160E;border-radius:20px 20px 0 0;padding:28px;text-align:center">
<img src="${d.origen}/brand/isotip-groc.png" width="56" height="56" alt="La Carmanyola" style="display:inline-block"></td></tr>
<tr><td style="background:#FFFFFF;border-radius:0 0 20px 20px;padding:28px">
<h1 style="margin:0 0 18px;font-size:24px;font-weight:400;color:#77160E">${escapa(d.titol)}</h1>${paragrafs}
</td></tr>
${baixa ? `<tr><td style="padding:20px 8px;font-size:12px;line-height:1.6;color:#6E6259;text-align:center">${escapa(p.per)}<br><a href="${baixa}" style="color:#6E6259">${escapa(p.baixa)}</a></td></tr>` : ""}
</table></td></tr></table></body></html>`;
  const text = `${d.titol}\n\n${d.cos}${baixa ? `\n\n—\n${p.per}\n${p.baixa}: ${baixa}` : ""}`;
  return { html, text };
}

export interface Correu {
  a: string;
  assumpte: string;
  titol: string;
  cos: string;
  locale: "ca" | "es" | "en";
  origen: string;
  /** Si és comercial: porta l'enllaç de baixa i la capçalera List-Unsubscribe (RFC 8058). */
  clientId?: string;
}

export async function enviaCorreu(c: Correu): Promise<{ enviat: boolean; id?: string; error?: string }> {
  const { html, text } = plantilla(c);
  if (!correuConfigurat()) {
    console.info(`[correu] sense RESEND_API_KEY, no s'envia a ${c.a}: ${c.assumpte}`);
    return { enviat: false, error: "sense-configurar" };
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CORREU_DES_DE,
      to: [c.a],
      subject: c.assumpte,
      html,
      text,
      ...(c.clientId && {
        headers: {
          "List-Unsubscribe": `<${enllacBaixaUnClic(c.origen, c.clientId)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    }),
    cache: "no-store",
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) return { enviat: false, error: json?.message ?? String(r.status) };
  return { enviat: true, id: json.id };
}
