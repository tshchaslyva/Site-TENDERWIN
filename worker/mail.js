// Надсилання листів через Resend (https://resend.com) і тексти листів.
import { esc, money } from "./format.js";

/** Uint8Array → base64 (без Buffer, працює у Workers) */
export function toBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function sendMail(env, { to, subject, html, text, replyTo, attachments = [] }) {
  const base = (env.MAIL_API_URL || "https://api.resend.com").replace(/\/$/, "");
  const res = await fetch(base + "/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [to],
      subject,
      html,
      text,
      reply_to: replyTo || undefined,
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.base64 })),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const wrapHtml = (inner) => `<!doctype html><html lang="uk"><body style="margin:0;background:#f4f6f9;padding:24px 12px;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#101d2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dfe6ee">
<tr><td style="background:#0B1B2B;padding:18px 28px;font-weight:800;font-size:20px;letter-spacing:-.01em;color:#ffffff">TENDER<span style="color:#e0a53c">WIN</span></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6">${inner}</td></tr>
</table></body></html>`;

/** Лист клієнту: подяка + рахунок у вкладенні (або обіцянка надіслати рахунок) */
export function clientEmail({ greetingName, invoiceNo, amount, tenderId, code, hasInvoice, seller }) {
  const hello = greetingName ? `Добрий день, ${greetingName}!` : "Добрий день!";
  const subject = hasInvoice
    ? `Рахунок № ${invoiceNo} — аналіз відхилення ${tenderId} | TenderWin`
    : `Заявку отримано — аналіз відхилення ${tenderId} | TenderWin`;

  const invoiceHtml = hasInvoice
    ? `<p>У додатку до листа — <b>рахунок № ${esc(invoiceNo)}</b> на суму <b>${money(amount)}&nbsp;грн</b> (без ПДВ).
       Одразу після надходження оплати ми беремо справу в роботу, і <b>протягом 24 годин</b> ви отримаєте аналіз.</p>`
    : `<p>Рахунок на оплату надішлемо вам найближчим часом окремим листом. Одразу після оплати беремо справу в роботу,
       і <b>протягом 24 годин</b> ви отримаєте аналіз.</p>`;
  const invoiceText = hasInvoice
    ? `У додатку — рахунок № ${invoiceNo} на суму ${money(amount).replace(/ /g, " ")} грн (без ПДВ). Одразу після оплати беремо справу в роботу, аналіз — протягом 24 годин.`
    : `Рахунок на оплату надішлемо найближчим часом. Одразу після оплати беремо справу в роботу, аналіз — протягом 24 годин.`;

  const html = wrapHtml(`
    <p style="margin-top:0">${esc(hello)}</p>
    <p>Дякуємо за звернення до TenderWin. Ми отримали вашу заявку на аналіз відхилення тендерної пропозиції:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;font-size:14px">
      <tr><td style="padding:3px 16px 3px 0;color:#56687a">ID закупівлі</td><td><b>${esc(tenderId)}</b></td></tr>
      <tr><td style="padding:3px 16px 3px 0;color:#56687a">Код ЄДРПОУ/ІПН</td><td><b>${esc(code)}</b></td></tr>
    </table>
    ${invoiceHtml}
    <p>Договір та акт виконаних робіт підпишемо через сервіс «Вчасно».</p>
    <p>Якщо маєте питання — просто дайте відповідь на цей лист або зателефонуйте:
       <a href="tel:${esc(seller.phoneHref)}" style="color:#0B1B2B">${esc(seller.phone)}</a>.</p>
    <p style="margin-bottom:0">З повагою,<br><b>${esc(seller.signatureFull)}</b><br>TenderWin ·
       <a href="https://${esc(seller.site)}" style="color:#0B1B2B">${esc(seller.site)}</a></p>`);

  const text = [
    hello, "",
    "Дякуємо за звернення до TenderWin. Ми отримали вашу заявку на аналіз відхилення тендерної пропозиції:",
    `ID закупівлі: ${tenderId}`, `Код ЄДРПОУ/ІПН: ${code}`, "",
    invoiceText, "",
    "Договір та акт виконаних робіт підпишемо через сервіс «Вчасно».",
    `Питання — просто дайте відповідь на цей лист або телефонуйте: ${seller.phone}.`, "",
    "З повагою,", seller.signatureFull, `TenderWin · ${seller.site}`,
  ].join("\n");

  return { subject, html, text };
}

/** Лист Віталію: повні дані заявки + результат пошуку назви + статус листа клієнту */
export function ownerEmail({ f, invoiceNo, lookup, clientSent, clientError, hasInvoice }) {
  const row = (k, v) => `<tr><td style="padding:4px 16px 4px 0;color:#56687a;vertical-align:top">${esc(k)}</td><td>${v}</td></tr>`;
  const lookupText = lookup.found
    ? `${lookup.name}${lookup.active ? "" : ` (статус: ${lookup.status})`}`
    : `не знайдено — ${lookup.reason}`;
  const clientText = !f.email ? "e-mail не вказано"
    : clientSent ? (hasInvoice ? "надіслано з рахунком" : "надіслано без рахунку (не вказано IBAN)")
    : `НЕ надіслано: ${clientError || "невідома помилка"}`;

  const subject = `Нова заявка: ${f.tenderId}${invoiceNo ? ` · рахунок ${invoiceNo}` : ""}`;
  const html = wrapHtml(`
    <p style="margin-top:0"><b>Нова заявка з сайту tenderwin.in.ua</b></p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">
      ${row("Ім’я", esc(f.name))}
      ${row("Телефон", `<a href="tel:${esc(f.phone.replace(/[^\d+]/g, ""))}">${esc(f.phone)}</a>`)}
      ${row("E-mail", f.email ? `<a href="mailto:${esc(f.email)}">${esc(f.email)}</a>` : "—")}
      ${row("ID закупівлі", `<a href="https://prozorro.gov.ua/tender/${esc(f.tenderId)}">${esc(f.tenderId)}</a>`)}
      ${row("Код ЄДРПОУ/ІПН", esc(f.code))}
      ${row("Назва за реєстром", esc(lookupText))}
      ${row("Рахунок", invoiceNo ? esc(invoiceNo) + " (у вкладенні)" : "не виписано — вкажіть IBAN у налаштуваннях")}
      ${row("Лист клієнту", esc(clientText))}
      ${row("Ситуація", esc(f.message || "—").replace(/\n/g, "<br>"))}
      ${row("Згода на обробку ПД", "так")}
    </table>
    <p style="margin-bottom:0;color:#56687a;font-size:13px">Щоб відповісти клієнту, натисніть «Відповісти».</p>`);
  const text = [
    "Нова заявка з сайту tenderwin.in.ua", "",
    `Ім’я: ${f.name}`, `Телефон: ${f.phone}`, `E-mail: ${f.email || "—"}`,
    `ID закупівлі: ${f.tenderId}`, `Код ЄДРПОУ/ІПН: ${f.code}`, `Назва за реєстром: ${lookupText}`,
    `Рахунок: ${invoiceNo || "не виписано — вкажіть IBAN у налаштуваннях"}`, `Лист клієнту: ${clientText}`,
    `Ситуація: ${f.message || "—"}`,
  ].join("\n");
  return { subject, html, text };
}
