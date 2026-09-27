// TenderWin — обробник заявок з сайту.
//
// Статичні файли сайту (папка site/) Cloudflare віддає сам, без цього коду.
// Сюди потрапляють лише запити /api/*:
//   POST /api/zayavka — заявка з форми → лист Віталію + лист клієнту з PDF-рахунком.
//
// Налаштування — у wrangler.jsonc (vars) і секретах Cloudflare:
//   RESEND_API_KEY   — ключ Resend для надсилання листів (обов'язковий)
//   CLARITY_API_KEY  — ключ Clarity Project для пошуку назви за кодом (необов'язковий)
import { DurableObject } from "cloudflare:workers";
import fontRegular from "./fonts/FixelText-Regular.ttf";
import fontBold from "./fonts/FixelText-Bold.ttf";
import fontDisplay from "./fonts/FixelDisplay-ExtraBold.ttf";
import { buildInvoicePdf } from "./invoice.js";
import { lookupCounterparty } from "./lookup.js";
import { sendMail, clientEmail, ownerEmail, toBase64 } from "./mail.js";
import {
  isoDay, dotDate, addDays, clean, extractTenderId, isValidEdrpou, isValidRnokpp,
} from "./format.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

// ================================================================
// Реєстр рахунків: нумерація за день, журнал, обмеження частоти.
// Durable Object обробляє запити по черзі, тож номери не дублюються.
// ================================================================
export class InvoiceRegistry extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS counters (day TEXT PRIMARY KEY, n INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS invoices (
        number TEXT PRIMARY KEY, created TEXT NOT NULL, code TEXT, buyer TEXT,
        tender TEXT, email TEXT, amount REAL, emailed INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS hits (ip TEXT NOT NULL, ts INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS hits_ts ON hits (ts);
    `);
  }

  /** Обмеження: не більше perIp заявок з однієї IP за годину і perDay за добу загалом */
  admit(ip, perIp, perDay) {
    const now = Date.now();
    this.sql.exec("DELETE FROM hits WHERE ts < ?", now - 86400000);
    const byIp = this.sql.exec("SELECT COUNT(*) AS c FROM hits WHERE ip = ? AND ts > ?", ip, now - 3600000).one().c;
    if (byIp >= perIp) return { ok: false, reason: "ip" };
    const total = this.sql.exec("SELECT COUNT(*) AS c FROM hits").one().c;
    if (total >= perDay) return { ok: false, reason: "day" };
    this.sql.exec("INSERT INTO hits (ip, ts) VALUES (?, ?)", ip, now);
    return { ok: true };
  }

  /** Наступний порядковий номер рахунку за день: 1, 2, 3… */
  nextNumber(day) {
    return this.sql.exec(
      "INSERT INTO counters (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1 RETURNING n", day
    ).one().n;
  }

  logInvoice(rec) {
    this.sql.exec(
      "INSERT OR REPLACE INTO invoices (number, created, code, buyer, tender, email, amount, emailed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      rec.number, new Date().toISOString(), rec.code, rec.buyer, rec.tender, rec.email, rec.amount, rec.emailed ? 1 : 0
    );
  }
}

// ================================================================
// Перевірка полів форми
// ================================================================
function validate(body) {
  const f = {
    name: clean(body.name, 100),
    phone: clean(body.phone, 30),
    email: clean(body.email, 120).toLowerCase(),
    tenderId: extractTenderId(body.tender),
    code: clean(body.code, 20).replace(/\D/g, ""),
    message: clean(body.message, 2000),
    consent: body.consent === true || body.consent === "Так" || body.consent === "on",
  };
  if (f.name.length < 2) return { error: "Вкажіть ваше ім’я.", field: "name" };
  if (f.phone.replace(/\D/g, "").length < 9) return { error: "Вкажіть коректний номер телефону.", field: "phone" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) return { error: "Вкажіть коректний e-mail — на нього надійде рахунок.", field: "email" };
  if (!f.tenderId) return { error: "Вкажіть ID закупівлі у форматі UA-2026-01-01-000000-a.", field: "tender" };
  if (!/^\d{8}$|^\d{10}$/.test(f.code)) return { error: "Код ЄДРПОУ має 8 цифр, ІПН (РНОКПП) — 10 цифр.", field: "code" };
  if (!f.consent) return { error: "Потрібна згода на обробку персональних даних.", field: "consent" };
  f.codeValid = f.code.length === 8 ? isValidEdrpou(f.code) : isValidRnokpp(f.code);
  return { f };
}

/** Ім'я для привітання — лише літери, пробіли, апостроф і дефіс (без посилань) */
function safeGreeting(name) {
  const n = name.trim().replace(/\s+/g, " ");
  return /^[\p{L}’'ʼ -]{2,60}$/u.test(n) ? n : "";
}

function sellerFromEnv(env) {
  return {
    name: env.SELLER_NAME,
    signature: env.SELLER_SIGNATURE,
    signatureFull: env.SELLER_SIGNATURE_FULL,
    rnokpp: env.SELLER_RNOKPP,
    address: env.SELLER_ADDRESS,
    iban: (env.SELLER_IBAN || "").replace(/\s+/g, ""),
    bank: env.SELLER_BANK || "",
    taxNote: env.SELLER_TAX_NOTE,
    phone: env.SELLER_PHONE,
    phoneHref: (env.SELLER_PHONE || "").replace(/[^\d+]/g, ""),
    email: env.MAIL_OWNER,
    site: env.SITE_DOMAIN,
  };
}

// ================================================================
// POST /api/zayavka
// ================================================================
async function handleZayavka(request, env) {
  // лише з нашого сайту
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.length && !allowed.includes(origin)) return json({ ok: false, error: "Forbidden" }, 403);

  if (Number(request.headers.get("Content-Length") || 0) > 20000) return json({ ok: false, error: "Завеликий запит." }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Некоректні дані форми." }, 400); }

  // пастка для ботів: приховане поле або надто швидке заповнення — вдаємо успіх
  if (body.botcheck || (typeof body.elapsed === "number" && body.elapsed < 1200)) {
    return json({ ok: true, invoice: null, emailed: false });
  }

  const v = validate(body);
  if (v.error) return json({ ok: false, error: v.error, field: v.field }, 400);
  const f = v.f;

  // без ключа Resend листів не надішлемо — хай сайт скористається запасним каналом (Web3Forms)
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return json({ ok: false, fallback: true, error: "mail-not-configured" }, 503);

  const registry = env.REGISTRY.get(env.REGISTRY.idFromName("main"));
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const gate = await registry.admit(ip, Number(env.LIMIT_PER_IP_HOUR || 3), Number(env.LIMIT_PER_DAY || 40));
  if (!gate.ok) {
    return json({ ok: false, error: "Забагато заявок за короткий час. Зателефонуйте або напишіть нам — відповімо одразу." }, 429);
  }

  const seller = sellerFromEnv(env);
  const price = Number(env.PRICE_UAH || 3499);
  const lookup = await lookupCounterparty(f.code, env).catch((e) => ({ found: false, reason: String(e) }));

  // ---------- рахунок (лише якщо вказано IBAN) ----------
  const now = new Date();
  let invoiceNo = null;
  let pdfBase64 = null;
  if (seller.iban) {
    const day = isoDay(now);
    const n = await registry.nextNumber(day);
    invoiceNo = `TW-${day}/${n}`;
    const title = `${env.SERVICE_TITLE || "Аналіз відхилення ТП"} ${f.tenderId}`;
    const pdf = await buildInvoicePdf({
      fonts: { regular: fontRegular, bold: fontBold, display: fontDisplay },
      seller,
      buyer: {
        name: lookup.found ? lookup.name : "",
        code: f.code,
        codeLabel: f.code.length === 8 ? "Код ЄДРПОУ" : "РНОКПП",
        address: lookup.found ? lookup.address : "",
      },
      number: invoiceNo,
      date: now,
      validUntil: addDays(now, Number(env.INVOICE_VALID_DAYS || 5)),
      items: [{ title, unit: "послуга", qty: 1, price }],
      purpose: `Оплата за рахунком № ${invoiceNo} від ${dotDate(now)}, ${(env.SERVICE_TITLE || "аналіз відхилення ТП").replace(/^А/, "а")} ${f.tenderId}, без ПДВ`,
    });
    pdfBase64 = toBase64(pdf);
  }
  const attachments = pdfBase64
    ? [{ filename: `Rakhunok_${invoiceNo.replace(/\//g, "-")}.pdf`, base64: pdfBase64 }]
    : [];

  // ---------- лист клієнту ----------
  let clientSent = false;
  let clientError = "";
  try {
    const m = clientEmail({
      greetingName: safeGreeting(f.name), invoiceNo, amount: price, tenderId: f.tenderId,
      code: f.code, hasInvoice: !!invoiceNo, seller,
    });
    await sendMail(env, { to: f.email, ...m, replyTo: env.MAIL_OWNER, attachments });
    clientSent = true;
  } catch (e) {
    clientError = String(e && e.message || e);
    console.error("client mail failed", clientError);
  }

  // ---------- лист Віталію (з копією рахунку) ----------
  try {
    const m = ownerEmail({ f, invoiceNo, lookup, clientSent, clientError, hasInvoice: !!invoiceNo });
    await sendMail(env, { to: env.MAIL_OWNER, ...m, replyTo: f.email, attachments });
  } catch (e) {
    console.error("owner mail failed", String(e && e.message || e));
    // лист Віталію не дійшов — просимо сайт продублювати заявку через Web3Forms
    return json({ ok: false, fallback: true, invoice: invoiceNo, emailed: clientSent, error: "owner-mail-failed" }, 502);
  }

  if (invoiceNo) {
    await registry.logInvoice({
      number: invoiceNo, code: f.code, buyer: lookup.found ? lookup.name : "", tender: f.tenderId,
      email: f.email, amount: price, emailed: clientSent,
    });
  }

  return json({ ok: true, invoice: invoiceNo, emailed: clientSent, email: f.email });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/zayavka") {
      if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405);
      try {
        return await handleZayavka(request, env);
      } catch (e) {
        console.error("zayavka crashed", e && e.stack || e);
        return json({ ok: false, fallback: true, error: "internal" }, 500);
      }
    }
    if (url.pathname.startsWith("/api/")) return json({ ok: false, error: "Not Found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
