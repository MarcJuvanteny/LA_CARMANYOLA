import { getTranslations } from "next-intl/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { comandaPublica } from "@/lib/comandes/comandes";
import { euros } from "@/lib/format";

// Tiquet de la comanda en PDF, amb format de tiquet de caixa (80 mm d'ample).
// Només per a comandes confirmades; l'id és un uuid, com a /comanda/[id].
export const dynamic = "force-dynamic";

const AMPLE = 227; // 80 mm
const MARGE = 18;
const GRANAT = rgb(0x77 / 255, 0x16 / 255, 0x0e / 255);
const TINTA = rgb(0x38 / 255, 0x38 / 255, 0x3a / 255);
const SUAU = rgb(0x6e / 255, 0x62 / 255, 0x59 / 255);
const LINIA = rgb(0xe6 / 255, 0xdc / 255, 0xcb / 255);

/** Les fonts estàndard del PDF només tenen WinAnsi: el que no hi càpiga es canvia per un equivalent. */
const net = (s: string) => s.replace(/−/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E\xA0-\xFF·×€–—…]/g, "");

function parteix(text: string, font: PDFFont, mida: number, ample: number): string[] {
  const linies: string[] = [];
  let actual = "";
  for (const paraula of text.split(/\s+/)) {
    const prova = actual ? `${actual} ${paraula}` : paraula;
    if (font.widthOfTextAtSize(prova, mida) <= ample || !actual) actual = prova;
    else {
      linies.push(actual);
      actual = paraula;
    }
  }
  if (actual) linies.push(actual);
  return linies;
}

export async function GET(_req: Request, { params }: RouteContext<"/comanda/[id]/tiquet">) {
  const { id } = await params;
  const comanda = await comandaPublica(id);
  if (!comanda || comanda.estat !== "confirmada") return new Response("No trobada", { status: 404 });
  const t = await getTranslations("web.comanda");

  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negreta = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(net(`${t("tiquet.titol")} ${comanda.numero ?? ""}`));
  pdf.setAuthor("La Carmanyola");

  // Primer es mesura tot (l'alçada del tiquet depèn de les línies) i després es dibuixa.
  type Op = { y: number; dibuixa: (y: number) => void };
  const ops: Op[] = [];
  let y = 0;
  const interior = AMPLE - 2 * MARGE;
  let pagina: ReturnType<PDFDocument["addPage"]>;

  const text = (s: string, o: { mida?: number; font?: PDFFont; color?: typeof TINTA; centre?: boolean; dreta?: boolean; x?: number } = {}) => {
    const { mida = 9, font = normal, color = TINTA } = o;
    const v = net(s);
    const w = font.widthOfTextAtSize(v, mida);
    const x = o.centre ? (AMPLE - w) / 2 : o.dreta ? AMPLE - MARGE - w : (o.x ?? MARGE);
    const yy = y;
    ops.push({ y: yy, dibuixa: (alt) => pagina.drawText(v, { x, y: alt - yy - mida, size: mida, font, color }) });
  };
  const ratlla = () => {
    const yy = y;
    ops.push({ y: yy, dibuixa: (alt) => pagina.drawLine({ start: { x: MARGE, y: alt - yy }, end: { x: AMPLE - MARGE, y: alt - yy }, thickness: 0.7, color: LINIA }) });
  };

  y = 22;
  text("La Carmanyola", { mida: 17, font: negreta, color: GRANAT, centre: true });
  y += 24;
  text(t("tiquet.subtitol"), { mida: 8, color: SUAU, centre: true });
  y += 11;
  text(t("adreca"), { mida: 8, color: SUAU, centre: true });
  y += 20;
  ratlla();
  y += 12;

  text(t("numero", { n: comanda.numero ?? "—" }).toUpperCase(), { mida: 9, font: negreta, color: GRANAT });
  text(comanda.nom, { mida: 9, dreta: true });
  y += 14;
  if (comanda.hora) {
    text(t("tiquet.recollida", { data: comanda.data, hora: comanda.hora }), { mida: 8.5, color: SUAU });
    y += 12;
  }
  text(t("tiquet.estat"), { mida: 8.5, color: SUAU });
  y += 18;

  for (const l of comanda.linies) {
    const preu = euros(l.preu * l.quantitat);
    const amplePreu = normal.widthOfTextAtSize(net(preu), 9) + 8;
    for (const [i, s] of parteix(net(`${l.quantitat} × ${l.nom}`), normal, 9, interior - amplePreu).entries()) {
      text(s, { mida: 9 });
      if (i === 0) text(preu, { mida: 9, dreta: true });
      y += 12;
    }
    const detalls = [l.detall, l.dinar && t("dinar", { nom: l.dinar.nom.toLowerCase() })].filter(Boolean) as string[];
    for (const d of detalls)
      for (const s of parteix(net(d), normal, 7.5, interior - amplePreu)) {
        text(s, { mida: 7.5, color: SUAU, x: MARGE + 8 });
        y += 10;
      }
    y += 4;
  }

  y += 2;
  ratlla();
  y += 10;
  text(t("total"), { mida: 11, font: negreta });
  text(euros(comanda.total), { mida: 11, font: negreta, dreta: true });
  y += 30;
  text(t("tiquet.gracies"), { mida: 9, color: GRANAT, centre: true });
  y += 14;
  text(t("tiquet.noFiscal"), { mida: 7, color: SUAU, centre: true });
  y += 24;

  pagina = pdf.addPage([AMPLE, y]);
  pagina.drawRectangle({ x: 0, y: y - 8, width: AMPLE, height: 8, color: GRANAT });
  for (const op of ops) op.dibuixa(y);

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="la-carmanyola-comanda-${comanda.numero ?? "tiquet"}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
