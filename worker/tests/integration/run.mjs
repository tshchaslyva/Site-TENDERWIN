// Інтеграційні тести обробника заявок на локальному Cloudflare Worker (wrangler dev) з імітацією Resend.
// Справжніх листів не надсилає. Запуск із кореня репозиторію:
//   npm ci && node worker/tests/integration/run.mjs
// Потрібен доступ до npm (wrangler завантажується через npx).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const MOCK = "http://127.0.0.1:9902";
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN = "test-admin-token-0123456789";
const OWNER = "vitalii@tenderwin.com.ua";
const TEST_IBAN = "UA743052990000026007233566001";   // вигаданий IBAN із правильною контрольною сумою
const results = [];
let currentRun = "";

function check(id, title, ok, detail = "") {
  results.push({ run: currentRun, id, title, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${title}${detail ? " — " + detail : ""}`);
}

let ipSeq = 1;
const freshIp = () => `10.0.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;

async function post(path, body, { ip = freshIp(), origin = BASE, raw = null, headers = {} } = {}) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, "CF-Connecting-IP": ip, ...headers },
    body: raw !== null ? raw : JSON.stringify(body),
  });
  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* */ }
  return { status: r.status, json, headers: r.headers };
}
const admin = (path, { method = "GET", body, token = ADMIN, ip = "10.9.9.9" } = {}) =>
  fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Origin: BASE, "CF-Connecting-IP": ip },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));
const act = (id, action, params = {}) => admin(`/api/admin/applications/${encodeURIComponent(id)}/action`, { method: "POST", body: { action, params } });
const getApp = (id) => admin(`/api/admin/applications/${encodeURIComponent(id)}`).then((r) => r.json);
const mock = (path, body) => fetch(MOCK + path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

let opSeq = 0;
const op = () => `test-op-${Date.now().toString(36)}-${++opSeq}-abcdef`;
const base = (over = {}) => ({
  op: op(), name: "Іван", email: `client${opSeq}@example.com`, tender: "UA-2026-09-30-000123-a",
  org: "ТОВ «Тест»", code: "14360570", lot: "", contact: "+380 67 123 45 67", message: "Рішення від 30.09",
  consent: true, botcheck: false, elapsed: 30000, ...over,
});

function startProc(cmd, args, env = {}) {
  // окрема група процесів: зупиняємо wrangler разом з дочірнім workerd
  const p = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let log = "";
  p.stdout.on("data", (d) => (log += d));
  p.stderr.on("data", (d) => (log += d));
  p.getLog = () => log;
  p.stop = async () => {
    try { process.kill(-p.pid, "SIGTERM"); } catch { /* */ }
    await sleep(1500);
    try { process.kill(-p.pid, "SIGKILL"); } catch { /* */ }
  };
  return p;
}
async function portFree(url, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { await fetch(url); } catch { return true; }
    await sleep(300);
  }
  return false;
}
async function waitFor(url, ms = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(url); if (r.status < 500) return true; } catch { /* */ }
    await sleep(500);
  }
  return false;
}

async function withWorker(name, vars, fn) {
  currentRun = name;
  console.log(`\n=== ${name} ===`);
  if (!(await portFree(BASE + "/"))) throw new Error(`порт ${PORT} зайнятий іншим процесом`);
  const state = mkdtempSync(join(tmpdir(), "tw-state-"));
  const args = ["--yes", "wrangler@4.141.0", "dev", "--port", String(PORT), "--ip", "127.0.0.1", "--persist-to", state, "--log-level", "warn"];
  for (const [k, v] of Object.entries(vars)) args.push("--var", `${k}:${v}`);
  const w = startProc("npx", args);
  const up = await waitFor(BASE + "/");
  if (!up) { console.log(w.getLog()); throw new Error("wrangler dev не запустився"); }
  try { await fn(); } finally {
    await w.stop();
    rmSync(state, { recursive: true, force: true });
  }
}

const commonVars = {
  MAIL_API_URL: MOCK,
  ALLOWED_ORIGINS: BASE,
};
// вигадані реквізити для тестового рахунку (справжні задаються секретами в Cloudflare)
const testSeller = { SELLER_RNOKPP: "3040512344", SELLER_ADDRESS: "01001, м. Київ, вул. Тестова, 1" };

async function main() {
  const m = startProc("node", [new URL("./mock-resend.mjs", import.meta.url).pathname]);
  await waitFor(MOCK + "/__sent", 10000);

  // ---------------- A: пошту не налаштовано, IBAN немає ----------------
  await withWorker("A: без ключа пошти й IBAN", { ...commonVars, ADMIN_TOKEN: ADMIN }, async () => {
    await mock("/__reset", {});
    const r = await post("/api/zayavka", base());
    check("T12", "Без RESEND_API_KEY заявку збережено, листи в черзі", r.status === 200 && r.json.saved && r.json.mail?.client === "pending" && r.json.mail?.owner === "pending",
      `${r.status} ${JSON.stringify(r.json.mail)}`);
    const d = await getApp(r.json.id);
    check("T12", "Причина затримки видна власнику", (d.mails || []).every((x) => /RESEND_API_KEY/.test(x.last_error || "")), d.mails?.map((x) => x.last_error).join(" | "));
    const acc = await act(r.json.id, "accept", {});
    check("T12", "Без IBAN автоматичний рахунок заблоковано з поясненням", acc.status === 400 && /IBAN/.test(acc.json.error || ""), acc.json.error);
    const acc2 = await act(r.json.id, "accept", { withoutInvoice: true });
    check("T12", "Можна прийняти замовлення з ручним рахунком", acc2.status === 200 && acc2.json.ok, acc2.json.message);
    const sent = await mock("/__sent");
    check("T12", "Жодного листа не надіслано без ключа", sent.hits.length === 0, `${sent.hits.length}`);
  });

  // ---------------- B: повна конфігурація з тестовим IBAN ----------------
  await withWorker("B: повна конфігурація (тестовий IBAN)", {
    ...commonVars, ...testSeller, RESEND_API_KEY: "re_test", ADMIN_TOKEN: ADMIN, SELLER_IBAN: TEST_IBAN, SELLER_BANK: "АТ «Тестовий банк»",
  }, async () => {
    await mock("/__reset", {});

    // заголовки, маршрути, Origin
    const g = await fetch(BASE + "/api/zayavka");
    check("R23", "GET /api/zayavka → 405 з безпековими заголовками", g.status === 405 && g.headers.get("x-content-type-options") === "nosniff"
      && /default-src 'none'/.test(g.headers.get("content-security-policy") || "") && g.headers.get("cache-control") === "no-store");
    const nf = await fetch(BASE + "/api/nothing");
    check("R23", "Невідомий /api/* → 404 JSON", nf.status === 404);
    const ev = await post("/api/zayavka", base(), { origin: "https://evil.example" });
    check("T15", "Запит з чужого Origin → 403, без резервного каналу", ev.status === 403 && !ev.json.fallback);

    // T06: успішна заявка
    const p1 = base({ name: "Віталій" });
    const r1 = await post("/api/zayavka", p1);
    check("T06", "Заявку збережено, обидва листи прийнято", r1.status === 200 && r1.json.saved && /^Z-\d{4}-\d{2}-\d{2}\/\d+$/.test(r1.json.id)
      && r1.json.mail.client === "accepted" && r1.json.mail.owner === "accepted", `${r1.json.id} ${JSON.stringify(r1.json.mail)}`);
    let sent = await mock("/__sent");
    const ack = sent.sent.find((x) => x.to === p1.email);
    const own = sent.sent.find((x) => x.to === OWNER);
    check("T04", "Лист клієнту: нейтральне «Добрий день!», 30-хвилинна консультація, 3 499 грн", ack && /^Добрий день!\n/.test(ack.text) && !/Віталій!/.test(ack.text)
      && /30-хвилинну консультацію/.test(ack.text) && /3 499 грн/.test(ack.text));
    check("T19", "Підпис: номер Zadarma, @TenderWin_UA, канал «Тендер+»; Reply-To — Віталій", ack && /\+380 800 357 135/.test(ack.text) && /@TenderWin_UA/.test(ack.text)
      && /t\.me\/tenderwin_plus/.test(ack.text) && ack.reply_to === OWNER);
    check("R02", "До прийняття замовлення рахунку у вкладенні немає", ack && ack.attachments.length === 0);
    check("T06", "Віталій отримав усі дані й посилання на робочий інструмент; Reply-To — клієнт", own && own.text.includes(p1.org) && own.text.includes(p1.tender)
      && /\/admin\/#/.test(own.text) && own.reply_to === p1.email);
    check("R01", "Лист має ключ повтору (Idempotency-Key)", sent.hits.every((h) => h.key), sent.hits.map((h) => h.key).join(", "));

    // T09 / R04: повтор із тим самим ключем
    const before = (await mock("/__sent")).sent.length;
    const r1b = await post("/api/zayavka", p1);
    sent = await mock("/__sent");
    check("T09", "Повтор того самого запиту → та сама заявка, нових листів немає", r1b.status === 200 && r1b.json.existing && r1b.json.id === r1.json.id && sent.sent.length === before);

    // T11: той самий ключ, інший зміст
    const r1c = await post("/api/zayavka", { ...p1, message: "інший текст" });
    check("T11", "Той самий ключ з іншими даними → 409, первинна заявка без змін", r1c.status === 409 && r1c.json.id === r1.json.id
      && (await getApp(r1.json.id)).app.message === p1.message);

    // T10: одночасні подання з одним ключем
    const pc = base();
    const many = await Promise.all(Array.from({ length: 6 }, () => post("/api/zayavka", pc)));
    const ids = new Set(many.map((x) => x.json.id));
    const list = await admin("/api/admin/applications?filter=all");
    const sameTender = list.json.items.filter((x) => x.email === pc.email);
    check("T10", "6 одночасних подань з одним ключем → одна заявка", ids.size === 1 && sameTender.length === 1 && many.every((x) => x.status === 200),
      `ids=${[...ids].join(",")} records=${sameTender.length}`);

    // T14 / R18: некоректні дані
    const bad = [
      ["null", "null", 400], ["масив", "[]", 400], ["рядок", '"x"', 400], ["невалідний JSON", "{", 400],
      ["об’єкт у полі name", JSON.stringify({ ...base(), name: { a: 1 } }), 400],
      ["число в consent", JSON.stringify({ ...base(), consent: 1 }), 400],
      ["неможлива дата в ID", JSON.stringify({ ...base(), tender: "UA-2026-99-99-000001-a" }), 400],
      ["ID без суфікса", JSON.stringify({ ...base(), tender: "UA-2026-09-30-000123" }), 400],
      ["код 9 цифр", JSON.stringify({ ...base(), code: "123456789" }), 400],
      ["опис 2001 символ", JSON.stringify({ ...base(), message: "я".repeat(2001) }), 400],
      ["без згоди", JSON.stringify({ ...base(), consent: false }), 400],
      ["тіло 25 КБ", JSON.stringify({ ...base(), message: "x".repeat(25000) }), 413],
    ];
    for (const [title, raw, code] of bad) {
      const r = await post("/api/zayavka", null, { raw });
      check("T14", `${title} → ${code}`, r.status === code && !r.json.fallback, `${r.status} ${r.json.error || ""}`);
    }
    const okLink = await post("/api/zayavka", base({ tender: "https://prozorro.gov.ua/tender/UA-2026-09-30-000777-a", code: "", noCode: true, contact: "@ivan_test" }));
    check("R19", "Посилання на закупівлю, «коду немає» і Telegram-контакт приймаються", okLink.status === 200
      && (await getApp(okLink.json.id)).app.tender === "UA-2026-09-30-000777-a");
    const chk = await post("/api/zayavka", base({ code: "14360571" }));
    check("R19", "Неправильна контрольна цифра — не блок, а позначка для Віталія", chk.status === 200 && /checksum/.test((await getApp(chk.json.id)).app.flags));

    // T13 / R03: швидке заповнення
    const fast = base({ elapsed: 100 });
    const rf = await post("/api/zayavka", fast);
    const df = await getApp(rf.json.id);
    sent = await mock("/__sent");
    check("T13", "Швидке заповнення: заявку збережено, автолист притримано, Віталію — з позначкою", rf.status === 200 && rf.json.saved && rf.json.mail.client === "held"
      && !sent.sent.some((x) => x.to === fast.email) && sent.sent.some((x) => x.to === OWNER && /^\[перевірте\]/.test(x.subject) && x.subject.includes(rf.json.id)));
    const rel = await act(rf.json.id, "retry_mail", { mailId: df.mails.find((x) => x.kind === "ack_client").id });
    check("T13", "Віталій може відпустити притриманий лист", rel.json.ok && (await mock("/__sent")).sent.some((x) => x.to === fast.email));

    // пастка для ботів
    const trap = base({ botcheck: true });
    const rt = await post("/api/zayavka", trap);
    check("T15", "Пастка: запис є (для перевірки), листів немає", rt.status === 200 && rt.json.saved && rt.json.mail.client === "held" && rt.json.mail.owner === "none");

    // T08: збій листа Віталію
    await mock("/__mode", { mode: "owner-down" });
    const po = base();
    const ro = await post("/api/zayavka", po);
    check("T08", "Лист Віталію не пройшов: заявку збережено, клієнт отримав підтвердження, статус «у черзі»", ro.status === 200 && ro.json.saved
      && ro.json.mail.client === "accepted" && ro.json.mail.owner === "pending");
    await mock("/__mode", { mode: "ok" });
    const dO = await getApp(ro.json.id);
    const ownerMail = dO.mails.find((x) => x.kind === "notify_owner");
    check("T08", "Видно спробу, причину й час наступного повтору", ownerMail.attempts === 1 && /Resend 500/.test(ownerMail.last_error) && ownerMail.next_at > Date.now());
    const rr = await act(ro.json.id, "retry_mail", { mailId: ownerMail.id });
    check("T08", "Контрольований повтор доставляє лист без нової заявки", rr.json.ok && (await getApp(ro.json.id)).mails.find((x) => x.kind === "notify_owner").status === "accepted");

    // T08: збій листа клієнту
    await mock("/__mode", { mode: "client-down" });
    const pcd = base();
    const rcd = await post("/api/zayavka", pcd);
    await mock("/__mode", { mode: "ok" });
    check("T08", "Лист клієнту не пройшов: заявка збережена, Віталій повідомлений, сайт каже «затримується»", rcd.status === 200 && rcd.json.mail.client === "pending" && rcd.json.mail.owner === "accepted");

    // постійна помилка адреси
    const pb = base({ email: "bounce-1@example.com" });
    const rb = await post("/api/zayavka", pb);
    const db = await getApp(rb.json.id);
    check("R07", "Відхилена адреса — «не надіслано» без нескінченних повторів", db.mails.find((x) => x.kind === "ack_client").status === "failed");

    // T16: ін'єкції
    const inj = base({ name: "<script>alert(1)</script>", org: "ТОВ \"О'Брайен\" <b>x</b> & Co " + "Дуже довга назва організації ".repeat(5),
      message: "'; DROP TABLE applications; --\nрядок 2\n<img src=x onerror=alert(1)>" });
    const ri = await post("/api/zayavka", inj);
    sent = await mock("/__sent");
    const oi = sent.sent.filter((x) => x.to === OWNER).pop();
    check("T16", "HTML/SQL у полях лишається текстом; таблиця заявок ціла", ri.status === 200 && oi && !oi.html.includes("<script>alert") && oi.html.includes("&lt;script&gt;")
      && !oi.html.includes("<img src=x") && (await admin("/api/admin/applications?filter=all")).json.items.length > 5);

    // T15 / T17: доступ до робочого інструмента
    const noTok = await fetch(BASE + "/api/admin/applications", { headers: { Origin: BASE } });
    check("T15", "Робочий інструмент без пароля → 401", noTok.status === 401);
    let lastWrong;
    for (let i = 0; i < 11; i++) lastWrong = await admin("/api/admin/applications", { token: "wrong-token-xxxxxxxxxxxx", ip: "10.8.8.8" });
    const blocked = await admin("/api/admin/applications", { ip: "10.8.8.8" });
    check("T15", "Після 10 невдалих спроб навіть правильний пароль з тієї ж адреси блокується на годину", lastWrong.status === 401 && blocked.status === 429);

    // T17: прийняття й рахунок
    const pi = base({ org: "Товариство з обмеженою відповідальністю «Дуже довга назва будівельної компанії з Полтавщини» ' ʼ — Їжак Ґудзик Єнот", lot: "лот 2" });
    const rp = await post("/api/zayavka", pi);
    const acc = await act(rp.json.id, "accept", { validUntilDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(new Date(Date.now() + 2 * 86400000)) });
    sent = await mock("/__sent");
    const inv = sent.sent.filter((x) => x.to === pi.email && /^Рахунок № TW-/.test(x.subject)).pop();
    check("T17", "Прийняття створює рахунок TW-…/N і лист із PDF; копія Віталію (bcc)", acc.json.ok && inv && inv.attachments.length === 1 && /\.pdf$/.test(inv.attachments[0].filename)
      && (inv.bcc || [])[0] === OWNER, acc.json.message);
    check("T02", "Лист із рахунком: 24 години після зарахування оплати, консультація після висновку", inv && /протягом 24 годин після зарахування оплати/.test(inv.text) && /консультація тривалістю 30 хвилин/.test(inv.text));
    const again = await act(rp.json.id, "accept", {});
    check("R04", "Повторне «Прийняти» не створює другого рахунку", again.status === 400 && /уже створено/.test(again.json.error || ""));
    const re = await act(rp.json.id, "resend_invoice", {});
    sent = await mock("/__sent");
    const invs = sent.sent.filter((x) => x.to === pi.email && /^Рахунок № /.test(x.subject));
    check("T08", "Повторне надсилання рахунку — той самий номер", re.json.ok && invs.length === 2 && invs[0].subject === invs[1].subject);
    globalThis.__pdf = inv ? inv.attachments[0].content : "";

    // T02 / T20: оплата, аналіз, консультація
    const paidAt = Date.now() - 60000;
    const pd = await act(rp.json.id, "paid", { paidAt });
    const dp = await getApp(rp.json.id);
    sent = await mock("/__sent");
    const pm = sent.sent.find((x) => x.to === pi.email && /^Оплату отримано/.test(x.subject));
    check("T02", "Оплата: строк = 24 години від зарахування, лист із датою й часом за Києвом", pd.json.ok && dp.app.analysis_due_at === paidAt + 86400000
      && dp.app.stage === "analysis_in_progress" && pm && /за київським часом/.test(pm.text));
    const dl = await act(rp.json.id, "delivered");
    const c1 = await act(rp.json.id, "consult", { status: "scheduled", at: Date.now() + 86400000 });
    const c2 = await act(rp.json.id, "consult", { status: "completed" });
    const dc = await getApp(rp.json.id);
    check("T20", "Консультація має окремий стан і не потребує оплати", dl.json.ok && c1.json.ok && c2.json.ok && dc.app.consult_status === "completed"
      && dc.app.stage === "analysis_delivered" && (await getApp(rp.json.id)).invoice.amount === 3499);

    // T17: обмеження частоти для однієї IP
    const ip = "10.7.7.7";
    const lim = [];
    for (let i = 0; i < 4; i++) lim.push(await post("/api/zayavka", base(), { ip }));
    check("T15", "4-та заявка з однієї IP за годину → 429 з телефоном/Telegram, без «одразу»", lim.slice(0, 3).every((x) => x.status === 200) && lim[3].status === 429
      && /телефоном чи в Telegram/.test(lim[3].json.error) && !/одразу/.test(lim[3].json.error));

    // обмеження на адресата
    const email = "same@example.com";
    const rc = [];
    for (let i = 0; i < 4; i++) rc.push(await post("/api/zayavka", base({ email, tender: `UA-2026-09-30-00010${i}-a` })));
    check("R17", "4-те автопідтвердження на ту саму адресу за 24 год притримується", rc.slice(0, 3).every((x) => x.json.mail.client === "accepted") && rc[3].json.mail.client === "held");
    const d1 = await post("/api/zayavka", base({ email: "dup@example.com" }));
    const d2 = await post("/api/zayavka", base({ email: "dup@example.com" }));
    check("R17", "Повторна заявка (та сама пошта й закупівля) позначається як можливий дублікат", !/dup:/.test((await getApp(d1.json.id)).app.flags)
      && (await getApp(d2.json.id)).app.flags.includes("dup:" + d1.json.id));
  });

  // ---------------- C: малі ліміти — поріг автолистів і граничний ліміт ----------------
  await withWorker("C: малі ліміти 24 год", { ...commonVars, RESEND_API_KEY: "re_test", ADMIN_TOKEN: ADMIN, LIMIT_ROLLING_24H: "2", HARD_LIMIT_ROLLING_24H: "4" }, async () => {
    await mock("/__reset", {});
    const r = [];
    for (let i = 0; i < 5; i++) r.push(await post("/api/zayavka", base()));
    const sent = await mock("/__sent");
    check("R17", "Після порогу заявки зберігаються, автолисти клієнтам притримано, Віталію — попередження", r[2].status === 200 && r[2].json.mail.client === "held"
      && r[2].json.mail.owner === "accepted" && sent.sent.some((x) => x.to === OWNER && /автолисти клієнтам притримано/.test(x.subject)));
    check("R17", "Граничний ліміт → 429 з альтернативним зв’язком і попередження Віталію", r[4].status === 429 && /телефоном чи в Telegram/.test(r[4].json.error)
      && (await mock("/__sent")).sent.some((x) => /граничної кількості/.test(x.subject)));
  });

  await m.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\nУсього: ${results.length}, пройдено: ${results.length - failed.length}, не пройдено: ${failed.length}`);
  if (process.env.TW_RESULTS) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(process.env.TW_RESULTS, JSON.stringify({ results, pdf: globalThis.__pdf || "" }, null, 1));
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
