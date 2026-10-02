// Допоміжні функції: дати за Києвом, суми прописом, перевірка кодів, очищення введення.

const TZ = "Europe/Kyiv";

const MONTHS_GEN = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"
];

/** Частини дати за київським часом: { y, m, d } */
export function kyivDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** 2026-09-27 — для номера рахунку */
export function isoDay(date = new Date()) {
  const { y, m, d } = kyivDateParts(date);
  return `${y}-${m}-${d}`;
}

/** 27.09.2026 */
export function dotDate(date = new Date()) {
  const { y, m, d } = kyivDateParts(date);
  return `${d}.${m}.${y}`;
}

/** 27 вересня 2026 р. */
export function longDate(date = new Date()) {
  const { y, m, d } = kyivDateParts(date);
  return `${Number(d)} ${MONTHS_GEN[Number(m) - 1]} ${y} р.`;
}

/** 3 жовтня 2026 р., 14:30 — дата й час за Києвом */
export function kyivDateTime(date) {
  const t = new Intl.DateTimeFormat("uk-UA", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${longDate(date)}, ${t}`;
}

/** Дата + N календарних днів */
export function addDays(date, n) {
  return new Date(date.getTime() + n * 86400000);
}

/** 3499 → "3 499,00" */
export function money(amount) {
  const [int, frac] = Number(amount).toFixed(2).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "," + frac;
}

// ---------- сума прописом ----------

const ONES_M = ["", "один", "два", "три", "чотири", "п’ять", "шість", "сім", "вісім", "дев’ять"];
const ONES_F = ["", "одна", "дві", "три", "чотири", "п’ять", "шість", "сім", "вісім", "дев’ять"];
const TEENS = ["десять", "одинадцять", "дванадцять", "тринадцять", "чотирнадцять", "п’ятнадцять",
  "шістнадцять", "сімнадцять", "вісімнадцять", "дев’ятнадцять"];
const TENS = ["", "", "двадцять", "тридцять", "сорок", "п’ятдесят", "шістдесят", "сімдесят", "вісімдесят", "дев’яносто"];
const HUNDREDS = ["", "сто", "двісті", "триста", "чотириста", "п’ятсот", "шістсот", "сімсот", "вісімсот", "дев’ятсот"];

/** Форма слова для числа: 1 гривня, 2 гривні, 5 гривень */
export function plural(n, [one, few, many]) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

function triad(n, feminine) {
  const words = [];
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
  if (h) words.push(HUNDREDS[h]);
  if (t === 1) {
    words.push(TEENS[o]);
  } else {
    if (t) words.push(TENS[t]);
    if (o) words.push((feminine ? ONES_F : ONES_M)[o]);
  }
  return words.join(" ");
}

/** 3499 → "Три тисячі чотириста дев’яносто дев’ять гривень 00 копійок" */
export function amountInWords(amount) {
  const total = Math.round(Number(amount) * 100);
  const uah = Math.floor(total / 100);
  const kop = total % 100;
  const parts = [];
  const millions = Math.floor(uah / 1e6);
  const thousands = Math.floor((uah % 1e6) / 1000);
  const rest = uah % 1000;
  if (millions) parts.push(triad(millions, false), plural(millions, ["мільйон", "мільйони", "мільйонів"]));
  if (thousands) parts.push(triad(thousands, true), plural(thousands, ["тисяча", "тисячі", "тисяч"]));
  if (rest) parts.push(triad(rest, true));
  if (!uah) parts.push("нуль");
  parts.push(plural(uah, ["гривня", "гривні", "гривень"]));
  const text = parts.filter(Boolean).join(" ");
  const kopText = String(kop).padStart(2, "0") + " " + plural(kop, ["копійка", "копійки", "копійок"]);
  return text.charAt(0).toUpperCase() + text.slice(1) + " " + kopText;
}

// ---------- перевірка кодів ----------

/** Контрольна цифра коду ЄДРПОУ (8 цифр) */
export function isValidEdrpou(code) {
  if (!/^\d{8}$/.test(code)) return false;
  const d = code.split("").map(Number);
  const num = Number(code);
  const base = num < 30000000 || num > 60000000 ? [1, 2, 3, 4, 5, 6, 7] : [7, 1, 2, 3, 4, 5, 6];
  let sum = base.reduce((s, w, i) => s + w * d[i], 0);
  let check = sum % 11;
  if (check >= 10) {
    sum = base.reduce((s, w, i) => s + (w + 2) * d[i], 0);
    check = sum % 11;
    if (check >= 10) check = 0;
  }
  return check === d[7];
}

/** Контрольна цифра РНОКПП / ІПН (10 цифр) */
export function isValidRnokpp(code) {
  if (!/^\d{10}$/.test(code)) return false;
  const d = code.split("").map(Number);
  const w = [-1, 5, 7, 9, 4, 6, 10, 5, 7];
  const sum = w.reduce((s, k, i) => s + k * d[i], 0);
  return ((sum % 11) % 10) === d[9];
}

/**
 * ID закупівлі Prozorro з тексту чи посилання: UA-2026-09-07-014600-a.
 * Повний синтаксис (з літерою-суфіксом) і реальна календарна дата; інакше "".
 * Це перевірка формату, а не доказ, що така закупівля існує.
 */
export function parseTenderId(text, now = new Date()) {
  const m = String(text || "").match(/(?:^|[^A-Za-z0-9])(UA)-(\d{4})-(\d{2})-(\d{2})-(\d{6})-([a-z])(?![A-Za-z0-9])/i);
  if (!m) return "";
  const [, , y, mo, d, n, suffix] = m;
  const year = Number(y), month = Number(mo), day = Number(d);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return "";
  if (year < 2015 || year > now.getUTCFullYear() + 1) return "";
  return `UA-${y}-${mo}-${d}-${n}-${suffix.toLowerCase()}`;
}

/**
 * Контакт для уточнень: телефон або Telegram.
 * Повертає { kind: "phone" | "telegram", value } або null, якщо формат не підходить.
 */
export function normalizeContact(text) {
  const s = String(text || "").trim();
  if (!s) return { kind: "", value: "" };
  const tg = s.match(/^(?:https?:\/\/)?(?:t\.me\/|telegram\.me\/|@)?([A-Za-z][A-Za-z0-9_]{4,31})\/?$/);
  if (tg && !/^\d/.test(tg[1])) return { kind: "telegram", value: "@" + tg[1] };
  if (/^\+?[\d\s()\-]{9,20}$/.test(s)) {
    const digits = s.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 15) return { kind: "phone", value: s.replace(/\s+/g, " ") };
  }
  return null;
}

/** IBAN України: UA + 27 цифр і правильна контрольна сума (mod 97) */
export function isValidIbanUa(iban) {
  const s = String(iban || "").replace(/\s+/g, "").toUpperCase();
  if (!/^UA\d{27}$/.test(s)) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  const digits = moved.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of digits) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

/** Екранування для HTML-листів */
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Прибирає керівні символи й обрізає довжину */
export function clean(s, max = 200) {
  return String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
