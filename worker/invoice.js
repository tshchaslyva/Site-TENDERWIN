// Генерація PDF-рахунку на оплату (A4) з українським шрифтом Fixel.
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { money as moneyNbsp, amountInWords, longDate, dotDate } from "./format.js";

// у шрифті PDF нерозривний пробіл надто широкий — використовуємо звичайний
const money = (v) => moneyNbsp(v).replace(/\u00a0/g, " ");

const INK = rgb(0.043, 0.106, 0.169);      // #0B1B2B
const TEXT = rgb(0.063, 0.114, 0.169);
const MUTED = rgb(0.34, 0.41, 0.48);
const GOLD = rgb(0.878, 0.647, 0.235);     // #E0A53C
const LINE = rgb(0.84, 0.87, 0.91);
const SOFT = rgb(0.96, 0.97, 0.98);

const charsets = new WeakMap();
/**
 * Символи, яких немає у шрифті, у PDF зникли б непомітно.
 * «ʼ» і «'» замінюємо типографським апострофом «’», решту відсутніх — знаком «?».
 */
function safe(font, s) {
  let set = charsets.get(font);
  if (!set) { set = new Set(font.getCharacterSet()); charsets.set(font, set); }
  return [...String(s).replace(/[ʼ'`]/g, "’")]
    .map((ch) => (ch === "\n" || ch === " " || set.has(ch.codePointAt(0)) ? ch : "?"))
    .join("");
}

/** Розбиває текст на рядки, що вміщуються в ширину */
function wrap(text, font, size, width) {
  const lines = [];
  for (const para of safe(font, text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(test, size) <= width) {
        line = test;
      } else {
        if (line) lines.push(line);
        // дуже довге слово ріжемо по символах
        let w = word;
        while (font.widthOfTextAtSize(w, size) > width) {
          let i = w.length;
          while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > width) i--;
          lines.push(w.slice(0, i));
          w = w.slice(i);
        }
        line = w;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * @param {object} p
 * @param {{regular:ArrayBuffer|Uint8Array, bold:ArrayBuffer|Uint8Array, display:ArrayBuffer|Uint8Array}} p.fonts
 * @param {{name:string, rnokpp:string, address:string, iban:string, bank:string, taxNote:string, phone:string, email:string, site:string}} p.seller
 * @param {{name:string, code:string, codeLabel:string, address?:string}} p.buyer
 * @param {string} p.number      TW-2026-09-27/1
 * @param {Date}   p.date
 * @param {Date}   p.validUntil
 * @param {{title:string, unit:string, qty:number, price:number}[]} p.items
 * @param {string} p.purpose     призначення платежу
 * @returns {Promise<Uint8Array>}
 */
export async function buildInvoicePdf(p) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Рахунок на оплату № ${p.number}`);
  pdf.setAuthor(p.seller.name);
  pdf.setSubject("Рахунок на оплату");
  pdf.setCreator("TenderWin");
  pdf.setProducer("TenderWin");
  pdf.setLanguage("uk-UA");

  const R = await pdf.embedFont(p.fonts.regular, { subset: true });
  const B = await pdf.embedFont(p.fonts.bold, { subset: true });
  const D = await pdf.embedFont(p.fonts.display, { subset: true });

  const page = pdf.addPage([595.28, 841.89]); // A4
  const W = page.getWidth();
  const M = 48;             // поля
  const CW = W - 2 * M;     // ширина вмісту
  let y = page.getHeight() - M;

  const text = (s, x, yy, { font = R, size = 10, color = TEXT } = {}) =>
    page.drawText(safe(font, s), { x, y: yy, font, size, color });
  const para = (s, x, yy, width, { font = R, size = 10, color = TEXT, lh = 1.4 } = {}) => {
    const lines = wrap(s, font, size, width);
    lines.forEach((ln, i) => text(ln, x, yy - i * size * lh, { font, size, color }));
    return lines.length * size * lh;
  };
  const hline = (yy, color = LINE, t = 0.8) =>
    page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: t, color });

  // ---------- шапка ----------
  page.drawRectangle({ x: M, y: y - 26, width: 26, height: 26, color: INK });
  page.drawLine({ start: { x: M + 6.5, y: y - 8.5 }, end: { x: M + 19.5, y: y - 8.5 }, thickness: 2.4, color: GOLD });
  page.drawLine({ start: { x: M + 13, y: y - 8.5 }, end: { x: M + 13, y: y - 18 }, thickness: 2.4, color: GOLD });
  page.drawLine({ start: { x: M + 9, y: y - 18 }, end: { x: M + 17, y: y - 18 }, thickness: 2.4, color: GOLD });
  text("TENDER", M + 34, y - 19, { font: D, size: 15, color: INK });
  text("WIN", M + 34 + D.widthOfTextAtSize("TENDER", 15), y - 19, { font: D, size: 15, color: GOLD });

  const contact = [p.seller.site, p.seller.email, p.seller.phone].filter(Boolean);
  contact.forEach((c, i) => {
    const w = R.widthOfTextAtSize(c, 9);
    text(c, W - M - w, y - 8 - i * 12, { size: 9, color: MUTED });
  });
  y -= 50;
  hline(y, GOLD, 1.5);
  y -= 34;

  // ---------- заголовок ----------
  const title = `Рахунок на оплату № ${p.number}`;
  text(title, M, y, { font: D, size: 20, color: INK });
  y -= 18;
  text(`від ${longDate(p.date)}`, M, y, { size: 11, color: MUTED });
  y -= 28;

  // ---------- сторони ----------
  const labelW = 110;
  const partyRow = (label, lines) => {
    text(label, M, y, { font: B, size: 10, color: MUTED });
    let h = 0;
    lines.forEach(([s, opts]) => {
      h += para(s, M + labelW, y - h, CW - labelW, opts || {});
    });
    y -= Math.max(h, 14) + 10;
  };

  const sellerLines = [
    [p.seller.name, { font: B, size: 10.5 }],
    [`РНОКПП ${p.seller.rnokpp}`],
    [p.seller.address],
  ];
  if (p.seller.iban) sellerLines.push([`IBAN ${p.seller.iban}`, { font: B }]);
  if (p.seller.bank) sellerLines.push([p.seller.bank]);
  if (p.seller.taxNote) sellerLines.push([p.seller.taxNote, { color: MUTED, size: 9.5 }]);
  partyRow("Постачальник", sellerLines);

  const buyerLines = [];
  if (p.buyer.name) buyerLines.push([p.buyer.name, { font: B, size: 10.5 }]);
  buyerLines.push([`${p.buyer.codeLabel} ${p.buyer.code}`, p.buyer.name ? {} : { font: B, size: 10.5 }]);
  if (p.buyer.address) buyerLines.push([p.buyer.address]);
  partyRow("Покупець", buyerLines);

  y -= 6;

  // ---------- таблиця ----------
  const cols = [
    { t: "№", w: 24, a: "c" },
    { t: "Найменування послуги", w: CW - 24 - 50 - 58 - 76 - 82, a: "l" },
    { t: "Од.", w: 50, a: "c" },
    { t: "Кількість", w: 58, a: "c" },
    { t: "Ціна, грн", w: 76, a: "r" },
    { t: "Сума, грн", w: 82, a: "r" },
  ];
  const pad = 7;
  const cell = (s, i, x, yy, font = R, size = 9.5, color = TEXT) => {
    const c = cols[i];
    const w = font.widthOfTextAtSize(s, size);
    const tx = c.a === "r" ? x + c.w - pad - w : c.a === "c" ? x + (c.w - w) / 2 : x + pad;
    text(s, tx, yy, { font, size, color });
  };

  // заголовок таблиці
  const headH = 24;
  page.drawRectangle({ x: M, y: y - headH, width: CW, height: headH, color: INK });
  let x = M;
  cols.forEach((c, i) => { cell(c.t, i, x, y - 15.5, B, 9, rgb(1, 1, 1)); x += c.w; });
  y -= headH;

  let total = 0;
  p.items.forEach((it, idx) => {
    const sum = it.qty * it.price;
    total += sum;
    const lines = wrap(it.title, R, 9.5, cols[1].w - 2 * pad);
    const rowH = Math.max(24, lines.length * 13 + 11);
    page.drawRectangle({ x: M, y: y - rowH, width: CW, height: rowH, color: idx % 2 ? SOFT : rgb(1, 1, 1), borderColor: LINE, borderWidth: 0.8 });
    let cx = M;
    const top = y - 15.5;
    cell(String(idx + 1), 0, cx, top); cx += cols[0].w;
    lines.forEach((ln, i) => text(ln, cx + pad, top - i * 13, { size: 9.5 })); cx += cols[1].w;
    cell(it.unit, 2, cx, top); cx += cols[2].w;
    cell(String(it.qty), 3, cx, top); cx += cols[3].w;
    cell(money(it.price), 4, cx, top); cx += cols[4].w;
    cell(money(sum), 5, cx, top, B);
    y -= rowH;
  });

  // підсумки
  y -= 16;
  const totalsX = W - M - 230;
  const totalRow = (label, value, bold = false) => {
    text(label, totalsX, y, { font: bold ? B : R, size: bold ? 11 : 10, color: bold ? INK : MUTED });
    const w = (bold ? B : R).widthOfTextAtSize(value, bold ? 11 : 10);
    text(value, W - M - w, y, { font: bold ? B : R, size: bold ? 11 : 10, color: bold ? INK : TEXT });
    y -= bold ? 18 : 15;
  };
  totalRow("Разом:", money(total) + " грн");
  totalRow("ПДВ:", "без ПДВ");
  page.drawLine({ start: { x: totalsX, y: y + 8 }, end: { x: W - M, y: y + 8 }, thickness: 0.8, color: LINE });
  y -= 4;
  totalRow("Усього до сплати:", money(total) + " грн", true);

  y -= 6;
  y -= para(`Сума прописом: ${amountInWords(total)}, без ПДВ.`, M, y, CW, { font: B, size: 10 });
  y -= 14;

  // ---------- призначення платежу ----------
  const purposeLines = wrap(p.purpose, R, 10, CW - 28);
  const boxH = 30 + purposeLines.length * 14;
  page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: rgb(0.992, 0.965, 0.91), borderColor: rgb(0.94, 0.86, 0.71), borderWidth: 0.8 });
  text("Призначення платежу", M + 14, y - 17, { font: B, size: 9, color: rgb(0.54, 0.35, 0.06) });
  purposeLines.forEach((ln, i) => text(ln, M + 14, y - 33 - i * 14, { size: 10 }));
  y -= boxH + 18;

  // ---------- примітки ----------
  const notes = [
    `Рахунок дійсний до ${dotDate(p.validUntil)} включно.`,
    "Письмовий аналіз — протягом 24 годин після зарахування оплати. Консультацію тривалістю 30 хвилин проводимо після передання висновку в погоджений час; окремо вона не оплачується.",
    "Договір та акт наданих послуг підписуються через сервіс «Вчасно».",
    "Рахунок сформовано в електронному вигляді, дійсний без підпису та печатки.",
  ];
  if (!p.seller.iban) notes.unshift("Реквізити для оплати (IBAN) надішлемо окремим листом.");
  notes.forEach((n) => { y -= para("•  " + n, M, y, CW, { size: 9.5, color: MUTED }) + 2; });

  // низ сторінки: сайт, телефон, пошта, номер рахунку
  const foot = [p.seller.site, p.seller.phone, p.seller.email].filter(Boolean).join("  ·  ");
  text(foot, M, 30, { size: 8, color: MUTED });
  const numW = R.widthOfTextAtSize(p.number, 8);
  text(p.number, W - M - numW, 30, { size: 8, color: MUTED });

  return pdf.save();
}
