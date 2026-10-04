// Генерує демонстраційний висновок (PDF) за першим кейсом із design2/cases.json.
// Запуск із кореня репозиторію: node design2/demo/make-demo.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const ROOT = new URL("../../", import.meta.url).pathname;
const data = JSON.parse(readFileSync(ROOT + "design2/cases.json", "utf8"));
const c = data.cases[0];
const font = (n) => readFileSync(ROOT + "worker/fonts/" + n);

const INK = rgb(0.043, 0.106, 0.169), TEXT = rgb(0.08, 0.12, 0.17), MUTED = rgb(0.33, 0.39, 0.45);
const GOLD = rgb(0.85, 0.64, 0.25), LINE = rgb(0.86, 0.88, 0.91), SOFT = rgb(0.97, 0.96, 0.93);
const GREEN = rgb(0.10, 0.45, 0.31), GREEN_SOFT = rgb(0.91, 0.96, 0.93);

const pdf = await PDFDocument.create();
pdf.registerFontkit(fontkit);
pdf.setTitle("Висновок щодо відхилення тендерної пропозиції — демонстраційний приклад");
pdf.setAuthor("TenderWin");
pdf.setCreator("TenderWin");
pdf.setProducer("TenderWin");
pdf.setLanguage("uk-UA");
const R = await pdf.embedFont(font("FixelText-Regular.ttf"), { subset: true });
const B = await pdf.embedFont(font("FixelText-Bold.ttf"), { subset: true });
const D = await pdf.embedFont(font("FixelDisplay-ExtraBold.ttf"), { subset: true });

const W = 595.28, H = 841.89, M = 52, CW = W - 2 * M;
let page, y;

function wrap(t, f, s, w) {
  const out = [];
  for (const para of String(t).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? line + " " + word : word;
      if (f.widthOfTextAtSize(test, s) <= w) line = test; else { if (line) out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}
const text = (s, x, yy, o = {}) => page.drawText(String(s), { x, y: yy, font: o.font || R, size: o.size || 10, color: o.color || TEXT });
function para(s, x, w, o = {}) {
  const size = o.size || 10, lh = size * (o.lh || 1.5);
  for (const ln of wrap(s, o.font || R, size, w)) { ensure(lh); text(ln, x, y, o); y -= lh; }
}
function ensure(h) { if (y - h < 70) newPage(); }

function newPage() {
  page = pdf.addPage([W, H]);
  // водяний знак
  page.drawText("ДЕМОНСТРАЦІЙНИЙ ПРИКЛАД", { x: 92, y: 230, size: 40, font: D, color: rgb(0.85, 0.64, 0.25), opacity: 0.09, rotate: degrees(38) });
  // шапка
  page.drawRectangle({ x: M, y: H - M - 24, width: 24, height: 24, color: INK });
  page.drawLine({ start: { x: M + 6, y: H - M - 8 }, end: { x: M + 18, y: H - M - 8 }, thickness: 2.2, color: GOLD });
  page.drawLine({ start: { x: M + 12, y: H - M - 8 }, end: { x: M + 12, y: H - M - 17 }, thickness: 2.2, color: GOLD });
  page.drawLine({ start: { x: M + 8, y: H - M - 17 }, end: { x: M + 16, y: H - M - 17 }, thickness: 2.2, color: GOLD });
  text("TENDER", M + 32, H - M - 17, { font: D, size: 13, color: INK });
  text("WIN", M + 32 + D.widthOfTextAtSize("TENDER", 13), H - M - 17, { font: D, size: 13, color: GOLD });
  const lab = "Демонстраційний приклад · дані вигадані";
  text(lab, W - M - R.widthOfTextAtSize(lab, 8.5), H - M - 14, { size: 8.5, color: MUTED });
  page.drawLine({ start: { x: M, y: H - M - 36 }, end: { x: W - M, y: H - M - 36 }, thickness: 1.2, color: GOLD });
  y = H - M - 62;
  // низ
  text("tenderwin.in.ua · +380 800 357 135 · vitalii@tenderwin.com.ua", M, 36, { size: 8, color: MUTED });
  const n = String(pdf.getPageCount());
  text(n, W - M - R.widthOfTextAtSize(n, 8), 36, { size: 8, color: MUTED });
}

function h2(t) { ensure(40); y -= 8; text(t, M, y, { font: D, size: 13, color: INK }); y -= 20; }

newPage();
text("Висновок щодо відхилення", M, y, { font: D, size: 22, color: INK }); y -= 26;
text("тендерної пропозиції", M, y, { font: D, size: 22, color: INK }); y -= 26;

// реквізити справи
const meta = [
  ["Закупівля", `${c.tender} (умовна)`], ["Предмет", c.subject], ["Очікувана вартість", c.budget],
  ["Учасник", "ТОВ «Умовна будівельна компанія»"], ["Рішення замовника", "протокол про відхилення від 21.08.2026"],
];
for (const [k, v] of meta) { text(k, M, y, { size: 9.5, color: MUTED }); para(v, M + 130, CW - 130, { size: 9.5 }); y -= 2; }
y -= 8;

// резюме
const boxH = 78;
ensure(boxH + 10);
page.drawRectangle({ x: M, y: y - boxH + 12, width: CW, height: boxH, color: GREEN_SOFT, borderColor: GREEN, borderWidth: 0.8 });
text("ВИСНОВОК", M + 14, y - 4, { font: B, size: 8.5, color: GREEN });
text(`${c.verdict} · ${c.strengthLabel.toLowerCase()}`, M + 14, y - 24, { font: D, size: 15, color: INK });
y -= 40;
const sum = "Підстава відхилення не підтверджується документами пропозиції. Рекомендуємо розглянути подання скарги в межах строку.";
for (const ln of wrap(sum, R, 9.5, CW - 28)) { text(ln, M + 14, y, { size: 9.5 }); y -= 14; }
y -= 18;

h2("1. Підстава відхилення (дослівно з рішення)");
para(`«${c.decision}»`, M, CW, { size: 10 });

h2("2. Зіставлення документів");
const rows = [
  ["Що зазначив замовник", c.decision, "Рішення про відхилення"],
  ["Вимога документації", c.requirement.text, c.requirement.ref],
  ["Що є в пропозиції", c.proposal.text, c.proposal.ref],
];
for (const [k, v, ref] of rows) {
  const lines = wrap(v, R, 9.5, CW - 150 - 16);
  const hgt = Math.max(lines.length * 14 + 26, 44);
  ensure(hgt + 6);
  page.drawRectangle({ x: M, y: y - hgt + 14, width: CW, height: hgt, color: SOFT, borderColor: LINE, borderWidth: 0.6 });
  text(k, M + 10, y, { font: B, size: 9.5, color: INK });
  let yy = y;
  for (const ln of lines) { text(ln, M + 150, yy, { size: 9.5 }); yy -= 14; }
  text(ref, M + 150, yy - 2, { font: B, size: 8.5, color: rgb(0.48, 0.33, 0.06) });
  y -= hgt + 6;
}

h2("3. Оцінка");
para(c.assessment, M, CW);
h2("4. Ризики");
para(c.risks, M, CW);
h2("5. Рекомендовані дії");
para(c.next, M, CW);
para("Консультація тривалістю 30 хвилин: пояснимо висновок і відповімо на запитання щодо наступних кроків.", M, CW, { color: MUTED });

h2("6. Джерела");
for (const s of ["Рішення замовника про відхилення пропозиції (Prozorro)", `Тендерна документація — ${c.requirement.ref}`, `Пропозиція учасника — ${c.proposal.ref}`]) {
  para("•  " + s, M, CW, { size: 9.5 });
}
y -= 10;
para(data.disclaimer + " Висновок має інформаційний характер і не гарантує рішення органу оскарження.", M, CW, { size: 8.5, color: MUTED });

const out = ROOT + "design2/dist/demo/";
mkdirSync(out, { recursive: true });
writeFileSync(out + "pryklad-vysnovku-demo.pdf", await pdf.save());
console.log("ok", pdf.getPageCount(), "стор.");
