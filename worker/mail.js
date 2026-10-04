// Надсилання листів через Resend (https://resend.com) і тексти листів.
// Тексти — за інструкцією v2.0, розділ 9.7. Звертання «Ви» з великої літери.
import { esc, money, dotDate, kyivDateTime } from "./format.js";

/** Uint8Array → base64 (без Buffer, працює у Workers) */
export function toBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Помилка провайдера: permanent = повтор не допоможе (неправильна адреса тощо) */
export class MailError extends Error {
  constructor(message, permanent = false) {
    super(message);
    this.permanent = permanent;
  }
}

/**
 * Один виклик Resend. Ключ повтору (Idempotency-Key) не дає надіслати той самий лист двічі
 * протягом 24 годин; довше дублікатам запобігає власний журнал листів (outbox).
 * Повертає ID листа в Resend. Прийняття листа провайдером ≠ доставлення.
 */
export async function sendMail(env, { to, bcc, replyTo, subject, html, text, attachments = [], idempotencyKey }) {
  const base = (env.MAIL_API_URL || "https://api.resend.com").replace(/\/$/, "");
  let res;
  try {
    res = await fetch(base + "/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [to],
        bcc: bcc ? [bcc] : undefined,
        subject,
        html,
        text,
        reply_to: replyTo || undefined,
        attachments: attachments.map((a) => ({ filename: a.filename, content: a.base64 })),
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new MailError(`Немає відповіді від Resend: ${String(e && e.message || e).slice(0, 200)}`);
  }
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    // 4xx (крім 409 і 429) — дані листа не приймуться і з повтором
    const permanent = res.status >= 400 && res.status < 500 && res.status !== 409 && res.status !== 429;
    throw new MailError(`Resend ${res.status}: ${body}`, permanent);
  }
  const out = await res.json().catch(() => ({}));
  return out.id || "";
}

// ================================================================
// Оформлення
// ================================================================

function signature(c) {
  const html = `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #dfe6ee;font-size:13px;line-height:1.6;color:#56687a">
    <b style="color:#101d2b">TenderWin · ${esc(c.person)}</b><br>
    <a href="tel:${esc(c.phone.e164)}" style="color:#101d2b">${esc(c.phone.display)}</a> ·
    Telegram: <a href="${esc(c.telegram.url)}" style="color:#101d2b">@${esc(c.telegram.username)}</a> ·
    <a href="mailto:${esc(c.email)}" style="color:#101d2b">${esc(c.email)}</a><br>
    <a href="https://${esc(c.site)}" style="color:#101d2b">${esc(c.site)}</a></p>`;
  const text = [
    "—",
    `TenderWin · ${c.person}`,
    `${c.phone.display} · Telegram: @${c.telegram.username} · ${c.email}`,
    c.site,
  ].join("\n");
  return { html, text };
}

const wrapHtml = (inner, sig) => `<!doctype html><html lang="uk"><body style="margin:0;background:#f4f6f9;padding:24px 12px;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#101d2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dfe6ee">
<tr><td style="background:#0B1B2B;padding:18px 28px;font-weight:800;font-size:20px;letter-spacing:-.01em;color:#ffffff">TENDER<span style="color:#e0a53c">WIN</span></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6">${inner}${sig ? sig.html : ""}</td></tr>
</table></body></html>`;

const p = (s) => `<p>${s}</p>`;
const rowsHtml = (rows) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;color:#56687a;vertical-align:top">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`)
    .join("")}</table>`;
const rowsText = (rows) => rows.map(([k, v]) => `${k}: ${v}`).join("\n");

// 3 499 грн — з нерозривними пробілами, щоб «грн» не відривалося від числа
const uah = (n) => `${money(n).replace(/,00$/, "")}\u00a0грн`;

function orderRows(app) {
  const rows = [["Закупівля", app.tender]];
  if (app.lot) rows.push(["Лот / рішення", app.lot]);
  rows.push(["Учасник", app.org]);
  if (app.code) rows.push([app.code.length === 8 ? "Код ЄДРПОУ" : "РНОКПП", app.code]);
  return rows;
}

// ================================================================
// Листи клієнту
// ================================================================

/** Лист про збереження заявки (до прийняття замовлення — без рахунку) */
export function renderAck(app, cfg) {
  const c = cfg.contacts;
  const sig = signature(c);
  const subject = `Заявку № ${app.id} збережено — TenderWin`;
  const lines = [
    "Добрий день!",
    `Ми отримали заявку № ${app.id} щодо закупівлі ${app.tender}.`,
    `Послуга включає письмовий аналіз відхилення та одну 30-хвилинну консультацію. Загальна вартість становить ${uah(cfg.price)}.`,
    "Перед оплатою підтвердимо обсяг роботи й можливість виконати її вчасно. Якщо потрібні уточнення, зв’яжемося з Вами за вказаними контактами.",
  ];
  const rows = orderRows(app);
  const html = wrapHtml(
    `<p style="margin-top:0">${esc(lines[0])}</p>${p(esc(lines[1]))}${rowsHtml(rows)}${p(esc(lines[2]))}${p(esc(lines[3]))}` +
      p("Надсилання заявки не є оплатою. Якщо в заявці є неточність, дайте відповідь на цей лист."),
    sig
  );
  const text = [lines[0], "", lines[1], "", rowsText(rows), "", lines[2], "", lines[3], "",
    "Надсилання заявки не є оплатою. Якщо в заявці є неточність, дайте відповідь на цей лист.", "", sig.text].join("\n");
  return { subject, html, text };
}

/** Лист із рахунком після прийняття замовлення */
export function renderInvoice(app, inv, cfg) {
  const c = cfg.contacts;
  const sig = signature(c);
  const subject = `Рахунок № ${inv.number} — аналіз відхилення ${app.tender} | TenderWin`;
  const l1 = `Підтвердили можливість виконати погоджений аналіз щодо закупівлі ${app.tender}. У вкладенні рахунок № ${inv.number} на ${uah(inv.amount)}.`;
  const l2 = "У ціну входять письмовий аналіз відхилення та одна консультація тривалістю 30 хвилин. Письмовий висновок підготуємо протягом 24 годин після зарахування оплати. Час консультації погодимо після передання висновку.";
  const l3 = cfg.termsUrl ? `Погоджені умови замовлення: ${cfg.termsUrl}` : "";
  const l4 = "Перед оплатою перевірте дані платника й предмет послуги. Якщо помітили неточність, повідомте відповіддю на цей лист.";
  const l5 = `Рахунок дійсний до ${dotDate(new Date(inv.validUntil))} включно.` +
    (cfg.seller && !cfg.seller.iban ? " Реквізити для оплати (IBAN) надішлемо окремим листом." : "");
  const html = wrapHtml(
    `<p style="margin-top:0">Добрий день!</p>${p(esc(l1))}${p(esc(l2))}` +
      (l3 ? p(`Погоджені умови замовлення: <a href="${esc(cfg.termsUrl)}" style="color:#0B1B2B">${esc(cfg.termsUrl)}</a>`) : "") +
      p(esc(l4)) + p(esc(l5)),
    sig
  );
  const text = ["Добрий день!", "", l1, "", l2, "", ...(l3 ? [l3, ""] : []), l4, "", l5, "", sig.text].join("\n");
  return { subject, html, text };
}

/** Підтвердження оплати з конкретним строком за Києвом */
export function renderPaid(app, cfg) {
  const sig = signature(cfg.contacts);
  const due = kyivDateTime(new Date(app.analysis_due_at));
  const subject = `Оплату отримано — замовлення № ${app.id} | TenderWin`;
  const l1 = `Оплату за замовленням № ${app.id} отримано. Письмовий аналіз надішлемо до ${due} (за київським часом). Після передання висновку погодимо час включеної 30-хвилинної консультації.`;
  const html = wrapHtml(`<p style="margin-top:0">Добрий день!</p>${p(esc(l1))}`, sig);
  const text = ["Добрий день!", "", l1, "", sig.text].join("\n");
  return { subject, html, text };
}

// ================================================================
// Службові листи Віталію
// ================================================================

export const FLAG_TEXT = {
  trap: "Заповнено приховане поле-пастку — найімовірніше, бот. Лист клієнту не надсилався.",
  fast: "Форму заповнено швидше ніж за 1,2 с (автозаповнення або бот). Лист клієнту притримано — перевірте й за потреби надішліть із робочого інструмента.",
  quota: "Перевищено поріг автолистів за останні 24 години — підтвердження клієнту притримано.",
  rcpt: "На цю адресу за останні 24 години вже надіслано кілька підтверджень — нове притримано.",
  checksum: "Контрольна цифра коду не збігається — перевірте код учасника.",
  nocode: "Учасник зазначив, що коду ЄДРПОУ/РНОКПП немає — уточніть дані.",
  payer: "Платник інший, ніж учасник — уточніть дані платника до рахунку.",
};

export function flagsText(flags) {
  return String(flags || "")
    .split(",")
    .filter(Boolean)
    .map((f) => (f.startsWith("dup:") ? `Можлива повторна заявка: № ${f.slice(4)} (та сама пошта й закупівля за 30 днів).` : FLAG_TEXT[f] || f));
}

/** Повідомлення Віталію про нову заявку */
export function renderOwner(app, cfg, { clientMail }) {
  const flags = flagsText(app.flags);
  const adminUrl = `https://${cfg.contacts.site}/admin/#${encodeURIComponent(app.id)}`;
  const subject = `${flags.length ? "[перевірте] " : ""}Нова заявка № ${app.id}: ${app.tender}`;
  const rows = [
    ["Заявка", app.id],
    ["Ім’я", app.name],
    ["Електронна пошта", app.email],
    ["Телефон / Telegram", app.contact || "—"],
    ["Учасник", app.org],
    ["Код", app.code || (app.no_code ? "немає — уточнити" : "—")],
    ["Платник", app.other_payer ? "інший, ніж учасник — уточнити" : "учасник"],
    ["Закупівля", app.tender],
    ["Лот / рішення", app.lot || "—"],
    ["Коротко про ситуацію", app.message || "—"],
    ["Згода на обробку ПД", "так"],
    ["Лист клієнту", clientMail],
  ];
  const tender = `https://prozorro.gov.ua/tender/${encodeURIComponent(app.tender)}`;
  const html = wrapHtml(
    `<p style="margin-top:0"><b>Нова заявка з сайту ${esc(cfg.contacts.site)}</b></p>` +
      (flags.length
        ? `<div style="margin:0 0 14px;padding:12px 14px;border-radius:10px;background:#fdf6e8;border:1px solid #f0dcb4;font-size:14px">${flags.map((f) => "• " + esc(f)).join("<br>")}</div>`
        : "") +
      `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${rows
        .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#56687a;vertical-align:top">${esc(k)}</td><td>${esc(v).replace(/\n/g, "<br>")}</td></tr>`)
        .join("")}</table>` +
      p(`<a href="${esc(tender)}" style="color:#0B1B2B">Закупівля в Prozorro</a> · <a href="${esc(adminUrl)}" style="color:#0B1B2B">Відкрити в робочому інструменті</a>`) +
      `<p style="margin-bottom:0;color:#56687a;font-size:13px">Наступний крок: перевірте учасника, рішення/лот, документи й строк. Потім у робочому інструменті —
        «Прийняти й надіслати рахунок» або «Потрібні уточнення». Кнопка «Відповісти» в цьому листі відповідає клієнту.</p>`
  );
  const text = [
    `Нова заявка з сайту ${cfg.contacts.site}`, "",
    ...(flags.length ? [...flags.map((f) => "! " + f), ""] : []),
    rowsText(rows), "",
    `Закупівля: ${tender}`, `Робочий інструмент: ${adminUrl}`,
  ].join("\n");
  return { subject, html, text };
}

/** Попередження Віталію про обмеження (поріг автолистів, повний ліміт) */
export function renderAlert(kind, cfg) {
  const subject = kind === "hard"
    ? "TenderWin: досягнуто граничної кількості заявок за 24 години"
    : "TenderWin: багато заявок за 24 години — автолисти клієнтам притримано";
  const body = kind === "hard"
    ? "За останні 24 години надійшло стільки заявок, що сайт тимчасово перестав приймати нові (відвідувачі бачать телефон і Telegram). Перевірте заявки в робочому інструменті: можливо, це атака бота. Ліміт — HARD_LIMIT_ROLLING_24H у wrangler.jsonc."
    : "За останні 24 години кількість заявок перевищила поріг LIMIT_ROLLING_24H. Заявки й далі зберігаються, а Вам приходять повідомлення, але автоматичні листи клієнтам притримано. Перевірте заявки в робочому інструменті й надішліть потрібні листи вручну.";
  const html = wrapHtml(`<p style="margin-top:0">${esc(body)}</p>${p(`<a href="https://${esc(cfg.contacts.site)}/admin/" style="color:#0B1B2B">Робочий інструмент</a>`)}`);
  return { subject, html, text: `${body}\n\nhttps://${cfg.contacts.site}/admin/` };
}
