import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import { StandardFonts } from "pdf-lib";
import { ShopOrder, orderStatusLabel, paymentLabel, statusLabels } from "./shop";

export async function createReceipt(order: ShopOrder) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedJpg(await readFile(path.join(process.cwd(), "public", "logo-artech.jpeg")));
  const blue = rgb(.035, .39, .88), ink = rgb(.08, .14, .23), muted = rgb(.38, .44, .53), border = rgb(.86, .9, .95);
  const left = 42, right = 553, width = right - left;
  let page = pdf.addPage([595.28, 841.89]), y = 0;
  const clean = (value: unknown) => String(value ?? "").replace(/[\u202f\u00a0]/g, " ").replace(/[’‘]/g, "'").replace(/[–—]/g, "-").replace(/œ/g, "oe").normalize("NFC").replace(/[^\x20-\x7e\xa0-\xff\n]/g, "?");
  const money = (amount: number) => clean(amount.toLocaleString("fr-FR")) + " FCFA";
  function text(value: unknown, x: number, baseline: number, size = 10, font = regular, color = ink) { page.drawText(clean(value), { x, y: baseline, size, font, color }); }
  function rightText(value: string, x: number, baseline: number, size = 10, font = regular, color = ink) { text(value, x - font.widthOfTextAtSize(clean(value), size), baseline, size, font, color); }
  function wrap(value: unknown, maxWidth: number, size = 10, font: PDFFont = regular) {
    const lines: string[] = [];
    for (const paragraph of clean(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (font.widthOfTextAtSize((line ? line + " " : "") + word, size) <= maxWidth) { line += (line ? " " : "") + word; continue; }
        if (line) lines.push(line); line = "";
        for (const char of word) { if (font.widthOfTextAtSize(line + char, size) > maxWidth) { lines.push(line); line = ""; } line += char; }
      }
      lines.push(line);
    }
    return lines;
  }
  function header() {
    const dimensions = logo.scaleToFit(68, 68);
    page.drawImage(logo, { x: left, y: 744 + (68 - dimensions.height) / 2, ...dimensions });
    text("ARTECH SOLUTIONS", 123, 786, 21, bold, blue);
    text("La technologie au service de vos besoins", 124, 767, 10, regular, muted);
    text("Quartier Zak, Niamey · +227 99 89 78 42", 124, 750, 9, regular, muted);
    page.drawLine({ start: { x: left, y: 731 }, end: { x: right, y: 731 }, color: blue, thickness: 1.5 });
    text(order.paymentStatus === "paid" ? "REÇU DE COMMANDE - PAYÉ" : "REÇU DE COMMANDE", left, 706, 15, bold);
    text(order.reference, left, 686, 10, bold, blue);
    rightText(new Date(order.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Niamey" }), right, 686, 9, regular, muted);
    y = 662;
  }
  function nextPage() { page = pdf.addPage([595.28, 841.89]); header(); }
  function paragraph(value: unknown, size = 10, font = regular, color = ink) {
    for (const line of wrap(value, width, size, font)) { if (y < 65) nextPage(); text(line, left, y, size, font, color); y -= size + 5; }
  }
  header();
  paragraph(`Commande : ${orderStatusLabel(order)}   |   Paiement : ${statusLabels[order.paymentStatus]}`, 10, bold);
  y -= 7; paragraph("CLIENT", 9, bold, blue); paragraph(order.customer.name, 11, bold); paragraph(order.customer.phone);
  if (order.fulfillment === "delivery") paragraph(`Livraison : ${order.deliveryAddress}`);
  else paragraph("Retrait en boutique : Quartier Zak, Niamey.");
  if (order.customer.note) paragraph(`Note : ${order.customer.note}`, 9, regular, muted);
  y -= 16;
  const columns = [left, 277, 323, 438, right];
  function tableHeader() {
    if (y < 125) nextPage();
    page.drawRectangle({ x: left, y: y - 28, width, height: 28, color: blue });
    text("ARTICLE", left + 10, y - 18, 9, bold, rgb(1, 1, 1));
    text("QTÉ", columns[1] + 10, y - 18, 9, bold, rgb(1, 1, 1));
    rightText("PRIX UNITAIRE", columns[3] - 10, y - 18, 9, bold, rgb(1, 1, 1));
    rightText("TOTAL", right - 10, y - 18, 9, bold, rgb(1, 1, 1));
    y -= 28;
  }
  tableHeader();
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i], lines = wrap(item.name, columns[1] - left - 20, 10);
    const height = Math.max(36, lines.length * 14 + 18);
    if (y - height < 70) { nextPage(); tableHeader(); }
    page.drawRectangle({ x: left, y: y - height, width, height, color: i % 2 ? rgb(.95, .97, 1) : rgb(1, 1, 1), borderColor: border, borderWidth: .5 });
    for (const x of columns.slice(1, -1)) page.drawLine({ start: { x, y }, end: { x, y: y - height }, color: border, thickness: .5 });
    lines.forEach((line, index) => text(line, left + 10, y - 20 - index * 14));
    rightText(String(item.quantity), columns[2] - 12, y - 20);
    rightText(money(item.price), columns[3] - 10, y - 20, 9);
    rightText(money(item.quantity * item.price), right - 10, y - 20, 9, bold);
    y -= height;
  }
  y -= 23;
  const pendingFee = order.fulfillment === "delivery" && order.deliveryFee == null;
  const notes = [
    `Moyen de paiement : ${paymentLabel(order.paymentMethod)}`,
    ...(order.paymentReference ? [`Référence transaction : ${order.paymentReference}`] : []),
    ...(order.fulfillment !== "delivery" ? ["Présentez ce reçu imprimé ou sur téléphone à la boutique."] : []),
    ...(order.paymentMethod === "IN_STORE" && order.paymentStatus !== "paid" ? ["À régler en boutique sur présentation de ce reçu."] : []),
    ...(pendingFee ? ["Frais de livraison à confirmer selon le quartier. Attendez le total final avant de payer."] : []),
    order.paymentStatus === "paid" ? "Paiement vérifié et confirmé par la boutique." : "Ce reçu de commande ne constitue pas une preuve de paiement.",
    ...(order.status === "cancelled" ? ["COMMANDE ANNULÉE - Ne pas effectuer de paiement."] : []),
  ];
  const noteHeight = notes.reduce((sum, n) => sum + wrap(n, width, 9).length * 14, 0);
  if (y - noteHeight - 125 < 65) nextPage();
  notes.forEach(note => paragraph(note, 9, regular, muted));
  y -= 20;
  if (y < 170) nextPage();
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  rightText(`Total articles : ${money(subtotal)}`, right - 12, y, 10); y -= 20;
  rightText(`Livraison : ${order.fulfillment === "delivery" ? pendingFee ? "à confirmer" : money(order.deliveryFee!) : "retrait gratuit"}`, right - 12, y, 10); y -= 16;
  page.drawRectangle({ x: left, y: y - 44, width, height: 44, color: blue });
  text(pendingFee ? "SOUS-TOTAL HORS LIVRAISON" : "TOTAL DE LA COMMANDE", left + 12, y - 28, 11, bold, rgb(1, 1, 1));
  rightText(money(order.total), right - 12, y - 28, 16, bold, rgb(1, 1, 1));
  y -= 65; text("Merci pour votre confiance !", left, y, 10, bold, blue);
  const pages = pdf.getPages();
  pages.forEach((p, index) => { p.drawLine({ start: { x: left, y: 44 }, end: { x: right, y: 44 }, color: border, thickness: .5 }); p.drawText(`ARTECH Solutions | ${order.reference} | ${index + 1} / ${pages.length}`, { x: left, y: 28, size: 8, font: regular, color: muted }); });
  pdf.setTitle(`Reçu ${order.reference}`); pdf.setAuthor("ARTECH Solutions");
  return pdf.save();
}
