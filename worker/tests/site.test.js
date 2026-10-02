// Перевірка узгодженості сайту з contacts.json і вимогами інструкції v2.0 (T24, T25, T29, TG02, TG05, TG06).
// Запуск: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const contacts = JSON.parse(read("contacts.json"));
const index = read("site/index.html");
const appJs = read("site/app.js");
const page404 = read("site/404.html");

const ACTIVE = [
  "site/index.html", "site/404.html", "site/app.js", "site/admin/index.html", "site/admin/admin.js", "site/_headers",
  "wrangler.jsonc", "contacts.json",
  ...readdirSync(join(ROOT, "worker")).filter((f) => f.endsWith(".js")).map((f) => "worker/" + f),
];

const text = (html) => html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/ /g, " ").replace(/\s+/g, " ").trim();

test("контакти сайту збігаються з contacts.json", () => {
  const nbspPhone = contacts.phone.display.replace(/ /g, "&nbsp;");
  for (const [name, html] of [["index.html", index], ["404.html", page404]]) {
    assert.ok(html.includes(`tel:${contacts.phone.e164}`), `${name}: посилання tel:`);
    assert.ok(html.includes(nbspPhone), `${name}: номер ${contacts.phone.display}`);
    assert.ok(html.includes(contacts.telegram.url), `${name}: Telegram-контакт`);
    assert.ok(html.includes("@" + contacts.telegram.username), `${name}: @${contacts.telegram.username}`);
    assert.ok(html.includes(contacts.channel.url), `${name}: канал`);
  }
  assert.ok(index.includes(contacts.email));
  assert.ok(index.includes(contacts.channel.label));
  assert.ok(index.includes(contacts.executor), "повне найменування виконавця");
  // app.js
  assert.ok(appJs.includes(`phone: "${contacts.phone.display}"`));
  assert.ok(appJs.includes(`phoneHref: "tel:${contacts.phone.e164}"`));
  assert.ok(appJs.includes(`email: "${contacts.email}"`));
  assert.ok(appJs.includes(`telegramUser: "${contacts.telegram.username}"`));
  assert.ok(appJs.includes(`telegramUrl: "${contacts.telegram.url}"`));
  assert.ok(appJs.includes(`telegramPrefill: "${contacts.telegram.prefill}"`));
  assert.ok(appJs.includes(`channelUrl: "${contacts.channel.url}"`));
  assert.ok(appJs.includes(`channelLabel: "${contacts.channel.label}"`));
});

test("T24: попередніх номерів немає в активних файлах", () => {
  for (const f of ACTIVE) {
    const s = read(f);
    for (const m of s.matchAll(/\+?\d[\d\s\-() ]{7,}\d|\d(?:&nbsp;|\d){8,}/g)) {
      const digits = m[0].replace(/&nbsp;/g, "").replace(/\D/g, "");
      assert.ok(!digits.endsWith("503101492") && !digits.endsWith("733262300"), `${f}: попередній номер ${m[0]}`);
    }
  }
});

test("TG02/TG05: Telegram-посилання лише на @TenderWin_UA і канал «Тендер+»", () => {
  for (const f of ACTIVE) {
    const s = read(f);
    assert.ok(!/t\.me\/\+/.test(s), `${f}: посилання t.me/+…`);
    for (const m of s.matchAll(/t\.me\/([A-Za-z0-9_+]+)/g)) {
      assert.ok(["tenderwin_ua", "tenderwin_plus", "s"].includes(m[1].toLowerCase()), `${f}: t.me/${m[1]}`);
    }
  }
});

test("T25/TG06: JSON-LD валідний і збігається з видимим текстом", () => {
  const ld = JSON.parse(index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const biz = ld["@graph"].find((x) => x["@type"] === "ProfessionalService");
  const faq = ld["@graph"].find((x) => x["@type"] === "FAQPage");
  assert.equal(biz.telephone, contacts.phone.e164);
  assert.equal(biz.contactPoint.telephone, contacts.phone.e164);
  assert.deepEqual([...biz.sameAs].sort(), [contacts.channel.url, contacts.telegram.url].sort());
  assert.equal(biz.makesOffer.price, "3499");
  assert.equal(biz.makesOffer.priceCurrency, "UAH");

  const faqHtml = index.slice(index.indexOf('<div class="faq">'), index.indexOf("<!-- ============ 7."));
  const visible = [...faqHtml.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<div class="answer">([\s\S]*?)<\/div>\s*<\/details>/g)]
    .map((m) => ({ q: text(m[1]), a: text(m[2].replace(/<li>/g, "<li>§")) }));
  assert.equal(faq.mainEntity.length, visible.length, "кількість питань");
  assert.equal(visible[0].q, "Як відбувається опрацювання моєї справи і коли я отримаю аналіз?");
  faq.mainEntity.forEach((q, i) => {
    assert.equal(q.name.replace(/ /g, " "), visible[i].q, `питання ${i + 1}`);
    // нумерацію списку у видимому тексті замінюємо на «1. 2. …», як у JSON-LD
    let n = 0;
    const vis = visible[i].a.replace(/§ ?/g, () => `${++n}. `).replace(/\s+/g, " ").trim();
    assert.equal(q.acceptedAnswer.text.replace(/ /g, " "), vis, `відповідь ${i + 1}`);
  });
});

test("пропозиція в title, description, OG", () => {
  assert.match(index, /<title>Аналіз відхилення за 24 години — TenderWin<\/title>/);
  const desc = "Аналіз відхилення тендерної пропозиції за 24 години та 30-хвилинна консультація. Письмовий висновок із посиланнями на документи. Вартість 3 499 грн.";
  assert.ok(index.includes(`<meta name="description" content="${desc}">`));
  assert.ok(index.includes(`<meta property="og:description" content="${desc}">`));
  assert.equal((index.match(/<h1[\s>]/g) || []).length, 1, "один H1");
});

test("T04: заборонені формулювання відсутні", () => {
  const visibleText = text(index.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, ""));
  for (const bad of ["30 хвилинна", "закупівлю відхилили", "Послуги і ціни", "акт виконаних робіт", "відповімо одразу",
    "лише 5 днів", "Вас відхиляють", "Ціна помилки", "E-mail"]) {
    assert.ok(!visibleText.includes(bad), `«${bad}»`);
  }
});

test("T29/ZD10: залишків вилучених функцій немає", () => {
  const banned = [/unitalk/i, /UNITALK_/, /originate/i, /\/api\/callback/, /\/api\/chat/, /AI-помічник/i, /referral/i, /\blookup/i, /CLARITY/i];
  for (const f of ACTIVE) {
    const s = read(f);
    for (const re of banned) assert.ok(!re.test(s), `${f}: ${re}`);
  }
});

test("форма: ті самі межі на клієнті й сервері", () => {
  const worker = read("worker/index.js");
  assert.match(index, /id="f-msg"[^>]*maxlength="2000"/);
  assert.match(appJs, /MESSAGE_MAX = 2000/);
  assert.match(worker, /MESSAGE_MAX = 2000/);
});

test("публічний репозиторій: особистих реквізитів у конфігурації немає", () => {
  const cfg = read("wrangler.jsonc");
  for (const key of ["SELLER_RNOKPP", "SELLER_ADDRESS", "SELLER_IBAN", "SELLER_BANK", "RESEND_API_KEY", "ADMIN_TOKEN"]) {
    assert.ok(!new RegExp(`"${key}"\\s*:`).test(cfg), `${key} має бути секретом у Cloudflare, а не в wrangler.jsonc`);
  }
});
