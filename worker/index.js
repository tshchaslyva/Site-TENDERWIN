// TenderWin — обробник заявок з сайту.
//
// Статичні файли сайту (папка site/) Cloudflare віддає сам, без цього коду.
// Сюди потрапляють лише запити /api/*:
//   POST /api/zayavka      — заявка з форми: спершу зберігаємо, потім листи
//   /api/admin/...         — робочий інструмент Віталія (сторінка /admin/), лише з ключем ADMIN_TOKEN
//
// Порядок роботи (інструкція v2.0, розділи 4.2 і 9):
//   1. Заявку зберігаємо в реєстрі разом із чергою листів — одна атомарна операція.
//   2. Відвідувач бачить «Заявку № … збережено», навіть якщо пошта тимчасово не працює.
//   3. Листи (підтвердження клієнту, повідомлення Віталію) надсилаються з черги з повторами.
//   4. Рахунок створюється лише після того, як Віталій прийняв замовлення в робочому інструменті.
//   5. Після оплати — лист зі строком аналізу (24 години від зарахування), далі консультація.
//
// Налаштування — у wrangler.jsonc (vars), контакти — у contacts.json, секрети — у Cloudflare:
//   RESEND_API_KEY — ключ Resend для листів
//   ADMIN_TOKEN    — пароль робочого інструмента /admin/
//   SELLER_RNOKPP, SELLER_ADDRESS, SELLER_IBAN, SELLER_BANK — реквізити для рахунку (репозиторій публічний)
import { DurableObject } from "cloudflare:workers";
import contacts from "../contacts.json";
import fontRegular from "./fonts/FixelText-Regular.ttf";
import fontBold from "./fonts/FixelText-Bold.ttf";
import fontDisplay from "./fonts/FixelDisplay-ExtraBold.ttf";
import { buildInvoicePdf } from "./invoice.js";
import { sendMail, toBase64, renderAck, renderOwner, renderInvoice, renderPaid, renderAlert, flagsText } from "./mail.js";
import {
  isoDay, dotDate, addDays, kyivEndOfDay, clean, parseTenderId, normalizeContact,
  isValidEdrpou, isValidRnokpp, isValidIbanUa,
} from "./format.js";

const MAX_BODY = 20000;                  // байтів у запиті з форми
const MESSAGE_MAX = 2000;                // символів у полі «Коротко про ситуацію» (так само в index.html)
const DAY = 86400000;
const HOUR = 3600000;
const RETRY_MINUTES = [1, 5, 15, 60, 180, 360];   // паузи між повторами листа; далі — «не вдалося»
const LEASE_MS = 90000;                  // скільки лист вважається «у процесі надсилання»
const EXPECTED_PRICE = 3499;             // ціна цього запуску; інша ціна в налаштуваннях блокує рахунки

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...SECURITY_HEADERS },
  });

// ================================================================
// Налаштування з wrangler.jsonc + contacts.json — в одному місці
// ================================================================
function config(env) {
  const price = Number(env.PRICE_UAH);
  return {
    contacts,
    price,
    priceOk: Number.isFinite(price) && price === EXPECTED_PRICE,
    serviceVersion: env.SERVICE_VERSION || "",
    termsVersion: env.TERMS_VERSION || "",
    termsUrl: env.TERMS_URL || "",
    invoiceValidDays: Math.max(1, Number(env.INVOICE_VALID_DAYS) || 2),
    seller: {
      name: env.SELLER_NAME || contacts.executor,
      rnokpp: env.SELLER_RNOKPP || "",
      address: env.SELLER_ADDRESS || "",
      iban: (env.SELLER_IBAN || "").replace(/\s+/g, "").toUpperCase(),
      bank: env.SELLER_BANK || "",
      taxNote: env.SELLER_TAX_NOTE || "",
      phone: contacts.phone.display,
      email: contacts.email,
      site: contacts.site,
    },
    limits: {
      perIpHour: Number(env.LIMIT_PER_IP_HOUR) || 3,
      perEmail24h: Number(env.LIMIT_PER_EMAIL_24H) || 3,
      soft24h: Number(env.LIMIT_ROLLING_24H) || 40,
      hard24h: Number(env.HARD_LIMIT_ROLLING_24H) || 150,
    },
    retentionDays: Number(env.RETENTION_DAYS) || 365,
    mailFrom: env.MAIL_FROM,
    owner: env.MAIL_OWNER || contacts.email,
  };
}

/** Предмет послуги — однаково в рахунку, листах і реєстрі (розділ 9.7) */
function serviceItem(tender, lot) {
  return `Аналіз відхилення тендерної пропозиції у закупівлі ${tender}${lot ? ` (${lot})` : ""} та консультація тривалістю 30 хвилин`;
}

/**
 * Що заважає створювати рахунки (порожній список — усе гаразд).
 * IBAN і банк необов'язкові: без них рахунок виходить із приміткою, що реквізити для оплати надішлемо окремо.
 */
function invoiceBlockers(cfg) {
  const s = cfg.seller, out = [];
  if (s.iban && !isValidIbanUa(s.iban)) out.push("IBAN має неправильний формат або контрольну суму (секрет SELLER_IBAN)");
  if (!isValidRnokpp(s.rnokpp)) out.push("РНОКПП виконавця відсутній або некоректний (секрет SELLER_RNOKPP)");
  if (!s.address) out.push("не вказано адресу виконавця (секрет SELLER_ADDRESS)");
  if (!cfg.priceOk) out.push(`ціна в налаштуваннях не ${EXPECTED_PRICE} грн`);
  return out;
}

// ================================================================
// Реєстр: заявки, рахунки, черга листів, обмеження частоти.
// Durable Object обробляє запити по черзі, тож номери й записи не дублюються.
// ================================================================
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS counters (day TEXT PRIMARY KEY, n INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS hits (ip TEXT NOT NULL, ts INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS hits_ts ON hits (ts);
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY, created INTEGER NOT NULL, updated INTEGER NOT NULL,
    op_key TEXT UNIQUE, fp TEXT NOT NULL,
    name TEXT, email TEXT, contact TEXT, org TEXT, code TEXT,
    no_code INTEGER DEFAULT 0, other_payer INTEGER DEFAULT 0,
    tender TEXT, lot TEXT, message TEXT,
    service_version TEXT, terms_version TEXT, consent_at INTEGER,
    flags TEXT DEFAULT '',
    intake TEXT NOT NULL DEFAULT 'received',
    stage TEXT NOT NULL DEFAULT 'new',
    amount INTEGER, invoice_no TEXT,
    paid_at INTEGER, analysis_due_at INTEGER, analysis_delivered_at INTEGER,
    consult_status TEXT DEFAULT '', consult_at INTEGER, consult_minutes INTEGER DEFAULT 30,
    notes TEXT DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS app_created ON applications (created);
  CREATE INDEX IF NOT EXISTS app_email_tender ON applications (email, tender);
  CREATE TABLE IF NOT EXISTS invoice_docs (
    number TEXT PRIMARY KEY, app_id TEXT NOT NULL UNIQUE, created INTEGER NOT NULL,
    amount INTEGER NOT NULL, buyer_name TEXT, buyer_code TEXT, item TEXT,
    valid_until INTEGER, pdf TEXT
  );
  CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT, app_id TEXT, kind TEXT NOT NULL,
    to_addr TEXT NOT NULL, bcc TEXT, reply_to TEXT,
    subject TEXT, html TEXT, text TEXT, invoice_no TEXT,
    idem_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL,
    hold_reason TEXT, attempts INTEGER NOT NULL DEFAULT 0,
    next_at INTEGER, lease_until INTEGER, provider_id TEXT, last_error TEXT,
    created INTEGER NOT NULL, updated INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS outbox_due ON outbox (status, next_at);
  CREATE INDEX IF NOT EXISTS outbox_app ON outbox (app_id);
  CREATE TABLE IF NOT EXISTS events (app_id TEXT, ts INTEGER NOT NULL, action TEXT NOT NULL, detail TEXT);
  CREATE INDEX IF NOT EXISTS events_app ON events (app_id);
  CREATE TABLE IF NOT EXISTS alerts (key TEXT PRIMARY KEY, ts INTEGER NOT NULL);
`;

const MAIL_LABEL = {
  ack_client: "Підтвердження заявки клієнту",
  notify_owner: "Повідомлення Віталію",
  invoice_client: "Рахунок клієнту",
  paid_client: "Підтвердження оплати клієнту",
  alert_owner: "Попередження Віталію",
};

export class InvoiceRegistry extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(SCHEMA);
  }

  // ---------- допоміжне ----------
  one(q, ...a) { return this.sql.exec(q, ...a).toArray()[0] || null; }
  all(q, ...a) { return this.sql.exec(q, ...a).toArray(); }
  count(q, ...a) { return Number(this.one(q, ...a)?.c || 0); }
  log(appId, action, detail = "") {
    this.sql.exec("INSERT INTO events (app_id, ts, action, detail) VALUES (?, ?, ?, ?)", appId, Date.now(), action, String(detail).slice(0, 500));
  }
  nextNumber(key) {
    return this.one("INSERT INTO counters (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1 RETURNING n", key).n;
  }
  /** Поставити лист у чергу. status: pending (надіслати) або held (притримати до рішення Віталія) */
  enqueue(appId, kind, mail, { to, bcc = null, replyTo = null, invoiceNo = null, idem, status = "pending", holdReason = null }) {
    const now = Date.now();
    return this.one(
      `INSERT INTO outbox (app_id, kind, to_addr, bcc, reply_to, subject, html, text, invoice_no, idem_key, status, hold_reason, next_at, created, updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      appId, kind, to, bcc, replyTo, mail.subject, mail.html, mail.text, invoiceNo, idem, status, holdReason, now, now, now
    ).id;
  }
  alertOnce(key, kind, cfg, everyMs = 6 * HOUR) {
    const last = this.one("SELECT ts FROM alerts WHERE key = ?", key);
    if (last && Date.now() - last.ts < everyMs) return null;
    this.sql.exec("INSERT INTO alerts (key, ts) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET ts = excluded.ts", key, Date.now());
    return this.enqueue(null, "alert_owner", renderAlert(kind, cfg), { to: cfg.owner, idem: `alert:${key}:${Date.now()}` });
  }
  mailState(appId, kind) {
    const r = this.one("SELECT status FROM outbox WHERE app_id = ? AND kind = ? ORDER BY id DESC LIMIT 1", appId, kind);
    return r ? r.status : "none";
  }

  // ================================================================
  // Нова заявка
  // ================================================================
  async submit(rec) {
    const cfg = config(this.env);
    const res = this.ctx.storage.transactionSync(() => this.#submitTx(rec, cfg));
    if (res.mailIds && res.mailIds.length) {
      // одразу пробуємо надіслати, але не довше ~6 секунд; решту доробить черга з повторами
      await this.processDue({ ids: res.mailIds, budgetMs: 6000 });
    } else {
      await this.scheduleAlarm();
    }
    if (res.status === "saved" || res.status === "existing") {
      res.mail = { client: this.mailState(res.id, "ack_client"), owner: this.mailState(res.id, "notify_owner") };
    }
    delete res.mailIds;
    return res;
  }

  #submitTx(rec, cfg) {
    const now = Date.now();
    // 1) той самий ключ операції — та сама заявка (повтор після тайм-ауту чи оновлення сторінки)
    if (rec.op) {
      const ex = this.one("SELECT id, fp FROM applications WHERE op_key = ?", rec.op);
      if (ex) return ex.fp === rec.fp ? { status: "existing", id: ex.id } : { status: "conflict", id: ex.id };
    }
    // 2) обмеження частоти
    this.sql.exec("DELETE FROM hits WHERE ts < ?", now - DAY);
    if (this.count("SELECT COUNT(*) AS c FROM hits WHERE ip = ? AND ts > ?", rec.ip, now - HOUR) >= cfg.limits.perIpHour) {
      return { status: "limited", reason: "ip" };
    }
    const last24 = this.count("SELECT COUNT(*) AS c FROM applications WHERE created > ?", now - DAY);
    if (last24 >= cfg.limits.hard24h) {
      const alertId = this.alertOnce("hard", "hard", cfg);
      return { status: "limited", reason: "global", mailIds: alertId ? [alertId] : [] };
    }
    this.sql.exec("INSERT INTO hits (ip, ts) VALUES (?, ?)", rec.ip, now);

    // 3) ознаки для перевірки (не підстава мовчки відкинути заявку)
    const flags = [...rec.flags];
    let alertId = null;
    if (last24 >= cfg.limits.soft24h) {
      flags.push("quota");
      alertId = this.alertOnce("soft", "soft", cfg);
    }
    if (this.count("SELECT COUNT(*) AS c FROM outbox WHERE kind = 'ack_client' AND to_addr = ? AND created > ? AND status != 'held'", rec.email, now - DAY) >= cfg.limits.perEmail24h) {
      flags.push("rcpt");
    }
    const dup = this.one("SELECT id FROM applications WHERE email = ? AND tender = ? AND created > ? ORDER BY created DESC LIMIT 1", rec.email, rec.tender, now - 30 * DAY);
    if (dup) flags.push("dup:" + dup.id);

    // 4) запис заявки
    const day = isoDay(new Date(now));
    // номер заявки: 20261003-1 (лише цифри — без літер Z і V); рахунок окремо: TW-2026-10-03/1
    const id = `${day.replace(/-/g, "")}-${this.nextNumber("app:" + day)}`;
    this.sql.exec(
      `INSERT INTO applications (id, created, updated, op_key, fp, name, email, contact, org, code, no_code, other_payer,
         tender, lot, message, service_version, terms_version, consent_at, flags, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, now, now, rec.op || null, rec.fp, rec.name, rec.email, rec.contact, rec.org, rec.code, rec.noCode ? 1 : 0, rec.otherPayer ? 1 : 0,
      rec.tender, rec.lot, rec.message, cfg.serviceVersion, cfg.termsVersion, now, flags.join(","), cfg.price
    );
    const app = this.one("SELECT * FROM applications WHERE id = ?", id);
    this.log(id, "submitted", flags.join(","));

    // 5) черга листів — у тій самій транзакції, що й заявка
    const mailIds = [];
    const holdReason = flags.includes("trap") ? "trap" : flags.includes("fast") ? "fast"
      : flags.includes("quota") ? "quota" : flags.includes("rcpt") ? "rcpt" : null;
    const ackStatus = holdReason ? "held" : "pending";
    const ackId = this.enqueue(id, "ack_client", renderAck(app, cfg), {
      to: rec.email, replyTo: cfg.owner, idem: `${id}:ack`, status: ackStatus, holdReason,
    });
    if (ackStatus === "pending") mailIds.push(ackId);
    if (!flags.includes("trap")) {
      const clientMail = holdReason ? `притримано (${flagsText(holdReason)[0] || holdReason})` : "у черзі на надсилання";
      mailIds.push(this.enqueue(id, "notify_owner", renderOwner(app, cfg, { clientMail }), {
        to: cfg.owner, replyTo: rec.email, idem: `${id}:owner`,
      }));
    }
    if (alertId) mailIds.push(alertId);
    return { status: "saved", id, mailIds };
  }

  // ================================================================
  // Черга листів: надсилання з повторами
  // ================================================================
  async processDue({ ids = null, budgetMs = 0 } = {}) {
    const now = Date.now();
    const rows = ids
      ? this.all(`SELECT * FROM outbox WHERE id IN (${ids.map(() => "?").join(",")}) AND status = 'pending'`, ...ids)
      : this.all(
          `SELECT * FROM outbox WHERE (status = 'pending' AND next_at <= ?) OR (status = 'sending' AND lease_until < ?)
           ORDER BY id LIMIT 10`, now, now);
    // позначаємо «надсилається» до першого await — паралельний виклик ці листи не візьме
    for (const r of rows) {
      this.sql.exec("UPDATE outbox SET status = 'sending', lease_until = ?, updated = ? WHERE id = ?", now + LEASE_MS, now, r.id);
    }
    // будильник на випадок, якщо об'єкт зупиниться посеред надсилання: після lease лист повториться
    if (rows.length) await this.scheduleAlarm();
    const work = Promise.allSettled(rows.map((r) => this.#sendOne(r))).then(() => this.scheduleAlarm());
    if (budgetMs) await Promise.race([work, new Promise((ok) => setTimeout(ok, budgetMs))]);
    else await work;
  }

  async #sendOne(r) {
    const now = () => Date.now();
    try {
      if (!this.env.RESEND_API_KEY || !this.env.MAIL_FROM) {
        const e = new Error("Пошту не налаштовано: немає секрету RESEND_API_KEY");
        throw e;
      }
      let attachments = [];
      if (r.invoice_no) {
        const inv = this.one("SELECT number, pdf FROM invoice_docs WHERE number = ?", r.invoice_no);
        if (!inv || !inv.pdf) throw new Error(`PDF рахунку ${r.invoice_no} не знайдено`);
        attachments = [{ filename: `Rakhunok_${inv.number.replace(/\//g, "-")}.pdf`, base64: inv.pdf }];
      }
      const providerId = await sendMail(this.env, {
        to: r.to_addr, bcc: r.bcc, replyTo: r.reply_to, subject: r.subject, html: r.html, text: r.text,
        attachments, idempotencyKey: r.idem_key,
      });
      this.sql.exec(
        "UPDATE outbox SET status = 'accepted', provider_id = ?, attempts = attempts + 1, last_error = NULL, lease_until = NULL, updated = ? WHERE id = ?",
        providerId, now(), r.id
      );
      if (r.app_id) this.log(r.app_id, "mail_accepted", `${r.kind} ${providerId}`);
    } catch (e) {
      const attempts = r.attempts + 1;
      const msg = String(e && e.message || e).slice(0, 300);
      const final = e && e.permanent || attempts > RETRY_MINUTES.length;
      this.sql.exec(
        "UPDATE outbox SET status = ?, attempts = ?, next_at = ?, last_error = ?, lease_until = NULL, updated = ? WHERE id = ?",
        final ? "failed" : "pending", attempts, final ? null : now() + RETRY_MINUTES[attempts - 1] * 60000, msg, now(), r.id
      );
      if (r.app_id) this.log(r.app_id, final ? "mail_failed" : "mail_retry", `${r.kind}: ${msg}`);
      console.error("mail", r.kind, r.app_id, msg);
    }
  }

  async scheduleAlarm() {
    const now = Date.now();
    const cfg = config(this.env);
    const times = [];
    const due = this.one(
      `SELECT MIN(CASE WHEN status = 'pending' THEN next_at ELSE lease_until END) AS t
       FROM outbox WHERE status IN ('pending', 'sending')`);
    if (due && due.t) times.push(due.t);
    const hit = this.one("SELECT MIN(ts) AS t FROM hits");          // IP-адреси — не довше 24 годин
    if (hit && hit.t) times.push(hit.t + DAY);
    const old = this.one(
      `SELECT MIN(updated) AS t FROM applications WHERE stage = 'new' AND intake IN ('received', 'clarification_needed', 'declined')`);
    if (old && old.t) times.push(old.t + cfg.retentionDays * DAY);
    if (!times.length) return;
    await this.ctx.storage.setAlarm(Math.max(now + 1000, Math.min(...times)));
  }

  async alarm() {
    const now = Date.now();
    const cfg = config(this.env);
    this.sql.exec("DELETE FROM hits WHERE ts < ?", now - DAY);
    this.sql.exec("DELETE FROM alerts WHERE ts < ?", now - 7 * DAY);
    // неоплачені звернення, що не перейшли в замовлення, — видаляємо після строку зберігання
    const stale = this.all(
      `SELECT id FROM applications WHERE stage = 'new' AND intake IN ('received', 'clarification_needed', 'declined') AND updated < ?`,
      now - cfg.retentionDays * DAY);
    for (const { id } of stale) {
      this.sql.exec("DELETE FROM outbox WHERE app_id = ?", id);
      this.sql.exec("DELETE FROM events WHERE app_id = ?", id);
      this.sql.exec("DELETE FROM applications WHERE id = ?", id);
    }
    await this.processDue();
  }

  // ================================================================
  // Робочий інструмент Віталія
  // ================================================================
  /** Невдалі спроби входу: не більше 10 за годину з однієї адреси */
  authGate(ip, ok) {
    const key = "auth:" + ip, now = Date.now();
    const fails = this.count("SELECT COUNT(*) AS c FROM hits WHERE ip = ? AND ts > ?", key, now - HOUR);
    if (fails >= 10) return false;
    if (!ok) this.sql.exec("INSERT INTO hits (ip, ts) VALUES (?, ?)", key, now);
    return ok;
  }

  list(filter = "open") {
    const now = Date.now();
    const rows = this.all(
      `SELECT a.id, a.created, a.name, a.org, a.email, a.tender, a.flags, a.intake, a.stage, a.invoice_no,
              a.analysis_due_at, a.consult_status, a.consult_at,
              (SELECT COUNT(*) FROM outbox o WHERE o.app_id = a.id AND (o.status IN ('failed', 'held')
                 OR (o.status IN ('pending', 'sending') AND o.created < ?))) AS mail_problems
       FROM applications a ORDER BY a.created DESC LIMIT 300`, now - 10 * 60000);
    const isOpen = (r) => r.intake !== "declined" && !(r.stage === "analysis_delivered" && r.consult_status === "completed");
    const isProblem = (r) => r.mail_problems > 0 || (r.flags && r.flags.length > 0)
      || (r.stage === "analysis_in_progress" && r.analysis_due_at && r.analysis_due_at - now < 3 * HOUR);
    const out = filter === "all" ? rows : filter === "problems" ? rows.filter(isProblem) : rows.filter(isOpen);
    const globalFailed = this.count("SELECT COUNT(*) AS c FROM outbox WHERE app_id IS NULL AND status = 'failed'");
    return { items: out, globalFailed, blockers: invoiceBlockers(config(this.env)), mail: this.mailHealth() };
  }

  /** Стан пошти для робочого інструмента: чи є ключ і чи не повертає Resend помилок (значення секретів не показуються) */
  mailHealth() {
    const lastErr = this.one("SELECT last_error, updated FROM outbox WHERE last_error IS NOT NULL ORDER BY updated DESC LIMIT 1");
    const lastOk = this.one("SELECT MAX(updated) AS t FROM outbox WHERE status = 'accepted'");
    const okAt = lastOk && lastOk.t ? lastOk.t : null;
    const errNewer = lastErr && (!okAt || lastErr.updated > okAt);
    return {
      configured: !!(this.env.RESEND_API_KEY && this.env.MAIL_FROM),
      from: this.env.MAIL_FROM || "",
      lastAcceptedAt: okAt,
      lastError: errNewer ? lastErr.last_error : "",
      lastErrorAt: errNewer ? lastErr.updated : null,
      waiting: this.count("SELECT COUNT(*) AS c FROM outbox WHERE status IN ('pending', 'sending')"),
    };
  }

  get(id) {
    const app = this.one("SELECT * FROM applications WHERE id = ?", id);
    if (!app) return null;
    const mails = this.all(
      "SELECT id, kind, to_addr, status, hold_reason, attempts, next_at, provider_id, last_error, created, updated FROM outbox WHERE app_id = ? ORDER BY id", id)
      .map((m) => ({ ...m, label: MAIL_LABEL[m.kind] || m.kind }));
    const invoice = this.one("SELECT number, created, amount, buyer_name, buyer_code, item, valid_until FROM invoice_docs WHERE app_id = ?", id);
    const events = this.all("SELECT ts, action, detail FROM events WHERE app_id = ? ORDER BY ts", id);
    const cfg = config(this.env);
    return { app, flags: flagsText(app.flags), mails, invoice, events, blockers: invoiceBlockers(cfg), validDays: cfg.invoiceValidDays };
  }

  /** Дії Віталія із заявкою. Повертає { ok, message } або { ok:false, error } */
  async act(id, action, params = {}) {
    const cfg = config(this.env);
    const app = this.one("SELECT * FROM applications WHERE id = ?", id);
    if (!app) return { ok: false, error: "Заявку не знайдено." };
    const now = Date.now();
    const touch = (sets, ...vals) => this.sql.exec(`UPDATE applications SET ${sets}, updated = ? WHERE id = ?`, ...vals, now, id);
    const text = (v, max = 500) => clean(typeof v === "string" ? v : "", max);

    switch (action) {
      case "clarify":
        if (app.intake === "accepted") return { ok: false, error: "Замовлення вже прийнято." };
        touch("intake = 'clarification_needed'");
        this.log(id, "clarify", text(params.note));
        return { ok: true, message: "Позначено: потрібні уточнення. Зв’яжіться з клієнтом зручним способом." };

      case "decline":
        if (app.stage !== "new" && app.stage !== "awaiting_payment") return { ok: false, error: "Після оплати замовлення не відхиляють тут — домовтеся з клієнтом окремо." };
        touch("intake = 'declined'");
        this.log(id, "decline", text(params.note));
        return { ok: true, message: "Заявку відхилено. Повідомте клієнта самостійно (лист не надсилався)." };

      case "accept": {
        if (app.intake === "declined") return { ok: false, error: "Заявку відхилено раніше." };
        const blockers = invoiceBlockers(cfg);
        // «дійсний до» — кінець обраного дня за Києвом; типово — через INVOICE_VALID_DAYS днів
        const validUntil = kyivEndOfDay(params.validUntilDate) || kyivEndOfDay(isoDay(addDays(new Date(now), cfg.invoiceValidDays)));
        if (validUntil < now) return { ok: false, error: "Дата чинності рахунку вже минула." };
        if (blockers.length) {
          if (!params.withoutInvoice) return { ok: false, error: "Рахунок не можна створити: " + blockers.join("; ") + ".", blockers };
          touch("intake = 'accepted', stage = CASE WHEN stage = 'new' THEN 'awaiting_payment' ELSE stage END");
          this.log(id, "accept_manual", "рахунок надсилається вручну");
          return { ok: true, message: "Замовлення прийнято. Рахунок надішліть вручну." };
        }
        const buyerName = text(params.buyerName, 200) || app.org;
        const buyerCode = String(params.buyerCode || app.code || "").replace(/\D/g, "");
        if (!/^\d{8}$|^\d{10}$/.test(buyerCode)) return { ok: false, error: "Для рахунку потрібен код платника: 8 цифр (ЄДРПОУ) або 10 цифр (РНОКПП)." };
        const lot = params.lot !== undefined ? text(params.lot, 100) : app.lot;
        const item = serviceItem(app.tender, lot);

        // номер рахунку закріплюємо за заявкою до генерації PDF: повтор дії не створить нового номера
        let inv = this.one("SELECT * FROM invoice_docs WHERE app_id = ?", id);
        if (inv && inv.pdf) return { ok: false, error: `Рахунок № ${inv.number} уже створено. Щоб надіслати його ще раз, натисніть «Надіслати рахунок повторно».` };
        if (!inv) {
          inv = this.ctx.storage.transactionSync(() => {
            const day = isoDay(new Date(now));
            const number = `TW-${day}/${this.nextNumber(day)}`;
            this.sql.exec(
              "INSERT INTO invoice_docs (number, app_id, created, amount, buyer_name, buyer_code, item, valid_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              number, id, now, cfg.price, buyerName, buyerCode, item, validUntil);
            this.log(id, "invoice_number", number);
            return this.one("SELECT * FROM invoice_docs WHERE number = ?", number);
          });
        } else {
          this.sql.exec("UPDATE invoice_docs SET buyer_name = ?, buyer_code = ?, item = ?, valid_until = ? WHERE number = ?",
            buyerName, buyerCode, item, validUntil, inv.number);
          inv = { ...inv, buyer_name: buyerName, buyer_code: buyerCode, item, valid_until: validUntil };
        }
        const created = new Date(inv.created);
        const pdf = await buildInvoicePdf({
          fonts: { regular: fontRegular, bold: fontBold, display: fontDisplay },
          seller: cfg.seller,
          buyer: { name: buyerName, code: buyerCode, codeLabel: buyerCode.length === 8 ? "Код ЄДРПОУ" : "РНОКПП" },
          number: inv.number,
          date: created,
          validUntil: new Date(validUntil),
          items: [{ title: item, unit: "послуга", qty: 1, price: cfg.price }],
          purpose: `Оплата за рахунком № ${inv.number} від ${dotDate(created)}, аналіз відхилення тендерної пропозиції у закупівлі ${app.tender} та консультація, без ПДВ`,
        });
        const mailId = this.ctx.storage.transactionSync(() => {
          // паралельне натискання «Прийняти» вже створило PDF і лист — другого листа не буде
          if (this.one("SELECT pdf FROM invoice_docs WHERE number = ?", inv.number)?.pdf) return null;
          this.sql.exec("UPDATE invoice_docs SET pdf = ? WHERE number = ?", toBase64(pdf), inv.number);
          touch("intake = 'accepted', stage = 'awaiting_payment', invoice_no = ?, lot = ?", inv.number, lot);
          this.log(id, "accept", inv.number);
          const fresh = this.one("SELECT * FROM applications WHERE id = ?", id);
          return this.enqueue(id, "invoice_client",
            renderInvoice(fresh, { number: inv.number, amount: inv.amount, validUntil }, cfg),
            { to: app.email, bcc: cfg.owner, replyTo: cfg.owner, invoiceNo: inv.number, idem: `${inv.number}:invoice:1` });
        });
        if (mailId === null) return { ok: true, message: `Рахунок № ${inv.number} уже створено.` };
        await this.processDue({ ids: [mailId], budgetMs: 8000 });
        return { ok: true, message: `Замовлення прийнято, рахунок № ${inv.number} ${this.mailWord(mailId)}.` };
      }

      case "resend_invoice": {
        const inv = this.one("SELECT * FROM invoice_docs WHERE app_id = ? AND pdf IS NOT NULL", id);
        if (!inv) return { ok: false, error: "Рахунку ще немає." };
        const n = this.count("SELECT COUNT(*) AS c FROM outbox WHERE app_id = ? AND kind = 'invoice_client'", id) + 1;
        const mailId = this.enqueue(id, "invoice_client",
          renderInvoice(app, { number: inv.number, amount: inv.amount, validUntil: inv.valid_until }, cfg),
          { to: app.email, bcc: cfg.owner, replyTo: cfg.owner, invoiceNo: inv.number, idem: `${inv.number}:invoice:${n}` });
        this.log(id, "resend_invoice", inv.number);
        await this.processDue({ ids: [mailId], budgetMs: 8000 });
        return { ok: true, message: `Рахунок № ${inv.number} (той самий номер) ${this.mailWord(mailId)}.` };
      }

      case "paid": {
        if (app.intake !== "accepted") return { ok: false, error: "Спершу прийміть замовлення." };
        if (app.paid_at) return { ok: false, error: "Оплату вже позначено." };
        const paidAt = Number(params.paidAt) || now;
        if (paidAt > now + 5 * 60000) return { ok: false, error: "Час зарахування не може бути в майбутньому." };
        const due = paidAt + 24 * HOUR;
        touch("paid_at = ?, analysis_due_at = ?, stage = 'analysis_in_progress'", paidAt, due);
        this.log(id, "paid", new Date(paidAt).toISOString());
        const fresh = this.one("SELECT * FROM applications WHERE id = ?", id);
        const mailId = this.enqueue(id, "paid_client", renderPaid(fresh, cfg), { to: app.email, replyTo: cfg.owner, idem: `${id}:paid` });
        await this.processDue({ ids: [mailId], budgetMs: 6000 });
        return { ok: true, message: `Оплату позначено. Строк аналізу — до ${dotDate(new Date(due))} (24 години від зарахування). Лист клієнту ${this.mailWord(mailId)}.` };
      }

      case "delivered":
        if (!app.paid_at) return { ok: false, error: "Оплату ще не позначено." };
        touch("analysis_delivered_at = ?, stage = 'analysis_delivered', consult_status = CASE WHEN consult_status = '' THEN 'to_schedule' ELSE consult_status END", now);
        this.log(id, "delivered");
        return { ok: true, message: "Аналіз позначено переданим. Наступний крок — погодити час консультації." };

      case "consult": {
        const st = String(params.status || "");
        if (!["to_schedule", "scheduled", "reschedule_requested", "completed"].includes(st)) return { ok: false, error: "Невідомий стан консультації." };
        if (!app.analysis_delivered_at) return { ok: false, error: "Консультація — після передання аналізу." };
        const at = st === "scheduled" ? Number(params.at) : app.consult_at;
        if (st === "scheduled" && !at) return { ok: false, error: "Вкажіть дату й час консультації." };
        touch("consult_status = ?, consult_at = ?", st, at || null);
        this.log(id, "consult_" + st, at ? new Date(at).toISOString() : "");
        return { ok: true, message: "Стан консультації оновлено." };
      }

      case "note": {
        const t = text(params.note, 1000);
        if (!t) return { ok: false, error: "Порожня нотатка." };
        touch("notes = ?", (app.notes ? app.notes + "\n" : "") + `${dotDate(new Date(now))}: ${t}`);
        this.log(id, "note", t);
        return { ok: true, message: "Нотатку збережено." };
      }

      case "retry_mail": {
        const m = this.one("SELECT * FROM outbox WHERE id = ? AND app_id = ?", Number(params.mailId), id);
        if (!m) return { ok: false, error: "Лист не знайдено." };
        if (m.status === "accepted") return { ok: false, error: "Цей лист уже прийнято поштовим сервісом." };
        if (m.status === "sending") return { ok: false, error: "Лист саме надсилається — оновіть сторінку за хвилину." };
        this.sql.exec("UPDATE outbox SET status = 'pending', attempts = 0, next_at = ?, hold_reason = NULL, updated = ? WHERE id = ?", now, now, m.id);
        this.log(id, "retry_mail", m.kind);
        await this.processDue({ ids: [m.id], budgetMs: 8000 });
        return { ok: true, message: `${MAIL_LABEL[m.kind] || "Лист"}: ${this.mailWord(m.id)}.` };
      }

      default:
        return { ok: false, error: "Невідома дія." };
    }
  }

  mailWord(mailId) {
    const r = this.one("SELECT status, last_error FROM outbox WHERE id = ?", mailId);
    if (!r) return "—";
    if (r.status === "accepted") return "прийнято поштовим сервісом";
    if (r.status === "failed") return `не надіслано (${r.last_error})`;
    return "у черзі на надсилання" + (r.last_error ? ` (остання помилка: ${r.last_error})` : "");
  }
}

// ================================================================
// Перевірка полів форми (ті самі правила, що в site/app.js)
// ================================================================
const STRING_FIELDS = ["name", "email", "tender", "org", "code", "lot", "contact", "message", "op"];
const BOOL_FIELDS = ["consent", "botcheck", "noCode", "otherPayer"];

function validate(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return { error: "Некоректні дані форми." };
  for (const k of STRING_FIELDS) {
    if (body[k] !== undefined && body[k] !== null && typeof body[k] !== "string") return { error: "Некоректні дані форми.", field: k };
  }
  for (const k of BOOL_FIELDS) {
    if (body[k] !== undefined && typeof body[k] !== "boolean") return { error: "Некоректні дані форми.", field: k };
  }
  if (body.elapsed !== undefined && (typeof body.elapsed !== "number" || !Number.isFinite(body.elapsed))) return { error: "Некоректні дані форми." };

  const rawMessage = clean(body.message, 100000);
  const f = {
    name: clean(body.name, 100),
    email: clean(body.email, 120).toLowerCase(),
    tender: parseTenderId(body.tender),
    org: clean(body.org, 200).replace(/\s+/g, " "),
    code: clean(body.code, 20).replace(/\D/g, ""),
    noCode: body.noCode === true,
    otherPayer: body.otherPayer === true,
    lot: clean(body.lot, 100),
    contactRaw: clean(body.contact, 60),
    message: rawMessage,
    op: /^[A-Za-z0-9-]{16,64}$/.test(body.op || "") ? body.op : "",
  };
  if (f.name.length < 2) return { error: "Вкажіть Ваше ім’я.", field: "name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) return { error: "Вкажіть коректну електронну пошту — на неї надішлемо підтвердження.", field: "email" };
  if (!f.tender) return { error: "Вкажіть ID закупівлі у форматі UA-2026-09-30-000123-a або посилання на закупівлю.", field: "tender" };
  if (f.org.length < 2) return { error: "Вкажіть назву учасника або ПІБ ФОП.", field: "org" };
  if (f.noCode) f.code = "";
  else if (!/^\d{8}$|^\d{10}$/.test(f.code)) return { error: "Код ЄДРПОУ має 8 цифр, РНОКПП — 10 цифр. Якщо коду немає, позначте «Коду немає — уточню окремо».", field: "code" };
  const contact = normalizeContact(f.contactRaw);
  if (!contact) return { error: "Вкажіть телефон (наприклад, +380 67 123 45 67) або Telegram (@username).", field: "contact" };
  f.contact = contact.value;
  if (rawMessage.length > MESSAGE_MAX) return { error: `Скоротіть опис ситуації до ${MESSAGE_MAX} символів.`, field: "message" };
  if (body.consent !== true) return { error: "Потрібна згода на обробку персональних даних.", field: "consent" };
  // контрольна цифра — лише попередження для Віталія, а не заборона (і не доказ існування суб'єкта)
  f.codeOk = !f.code || (f.code.length === 8 ? isValidEdrpou(f.code) : isValidRnokpp(f.code));
  return { f };
}

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Тіло запиту з реальним обмеженням розміру (Content-Length може бути відсутнім або хибним) */
async function readBody(request, max) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > max) return { tooLarge: true };
  if (!request.body) return { text: "" };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { reader.cancel().catch(() => {}); return { tooLarge: true }; }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.byteLength; }
  return { text: new TextDecoder().decode(all) };
}

function originAllowed(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return !origin || !allowed.length || allowed.includes(origin);
}

const registry = (env) => env.REGISTRY.get(env.REGISTRY.idFromName("main"));

// ================================================================
// POST /api/zayavka
// ================================================================
async function handleZayavka(request, env) {
  if (!originAllowed(request, env)) return json({ ok: false, error: "Запит не з сайту TenderWin." }, 403);
  const body = await readBody(request, MAX_BODY);
  if (body.tooLarge) return json({ ok: false, error: "Завеликий запит. Скоротіть опис ситуації." }, 413);
  let data;
  try { data = JSON.parse(body.text); } catch { return json({ ok: false, error: "Некоректні дані форми." }, 400); }

  const v = validate(data);
  if (v.error) return json({ ok: false, error: v.error, field: v.field }, 400);
  const f = v.f;

  const flags = [];
  if (data.botcheck === true) flags.push("trap");
  else if (typeof data.elapsed === "number" && data.elapsed < 1200) flags.push("fast");
  if (!f.codeOk) flags.push("checksum");
  if (f.noCode) flags.push("nocode");
  if (f.otherPayer) flags.push("payer");

  const fp = await sha256(JSON.stringify([f.name, f.email, f.tender, f.org, f.code, f.noCode, f.otherPayer, f.lot, f.contact, f.message]));
  let r;
  try {
    r = await registry(env).submit({
      op: f.op, fp, ip: request.headers.get("CF-Connecting-IP") || "unknown", flags,
      name: f.name, email: f.email, contact: f.contact, org: f.org, code: f.code, noCode: f.noCode,
      otherPayer: f.otherPayer, tender: f.tender, lot: f.lot, message: f.message,
    });
  } catch (e) {
    console.error("registry unavailable", e && e.stack || e);
    // заявку не збережено — сайт може передати її резервним каналом
    return json({ ok: false, saved: false, fallback: true, error: "storage-unavailable" }, 503);
  }

  if (r.status === "conflict") {
    return json({ ok: false, conflict: true, id: r.id,
      error: `Заявку № ${r.id} уже збережено з іншими даними. Щоб надіслати нову, натисніть «Надіслати як нову заявку».` }, 409);
  }
  if (r.status === "limited") {
    return json({ ok: false, limited: true,
      error: r.reason === "ip"
        ? "Забагато заявок з Вашої мережі за останню годину. Спробуйте пізніше або зв’яжіться з нами за телефоном чи в Telegram."
        : "Сайт тимчасово не приймає нові заявки. Зв’яжіться з нами за телефоном чи в Telegram." }, 429);
  }
  return json({ ok: true, saved: true, id: r.id, existing: r.status === "existing", email: f.email, mail: r.mail });
}

// ================================================================
// /api/admin/* — робочий інструмент (лише з паролем ADMIN_TOKEN)
// ================================================================
async function tokenMatches(given, expected) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

async function handleAdmin(request, env, path) {
  if (!originAllowed(request, env)) return json({ ok: false, error: "Запит не з сайту TenderWin." }, 403);
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 16) {
    return json({ ok: false, error: "Робочий інструмент не налаштовано: додайте секрет ADMIN_TOKEN (щонайменше 16 символів)." }, 503);
  }
  const reg = registry(env);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const auth = request.headers.get("Authorization") || "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const ok = given ? await tokenMatches(given, env.ADMIN_TOKEN) : false;
  if (!(await reg.authGate(ip, ok))) {
    return json({ ok: false, error: ok ? "Забагато невдалих спроб. Зачекайте годину." : "Неправильний пароль." }, ok ? 429 : 401);
  }

  if (request.method === "GET" && path === "/api/admin/applications") {
    const filter = new URL(request.url).searchParams.get("filter") || "open";
    return json({ ok: true, ...(await reg.list(filter)) });
  }
  const m = path.match(/^\/api\/admin\/applications\/(.+?)(\/action)?$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    if (request.method === "GET" && !m[2]) {
      const item = await reg.get(id);
      return item ? json({ ok: true, ...item }) : json({ ok: false, error: "Заявку не знайдено." }, 404);
    }
    if (request.method === "POST" && m[2]) {
      const body = await readBody(request, 8000);
      if (body.tooLarge) return json({ ok: false, error: "Завеликий запит." }, 413);
      let data;
      try { data = JSON.parse(body.text); } catch { return json({ ok: false, error: "Некоректні дані." }, 400); }
      if (!data || typeof data !== "object" || typeof data.action !== "string") return json({ ok: false, error: "Некоректні дані." }, 400);
      const res = await reg.act(id, data.action, data.params && typeof data.params === "object" ? data.params : {});
      return json(res, res.ok ? 200 : 400);
    }
  }
  return json({ ok: false, error: "Not Found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/api/zayavka") {
        if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405);
        return await handleZayavka(request, env);
      }
      if (path.startsWith("/api/admin/")) return await handleAdmin(request, env, path);
    } catch (e) {
      console.error("api crashed", e && e.stack || e);
      return json({ ok: false, error: "internal" }, 500);
    }
    if (path.startsWith("/api/")) return json({ ok: false, error: "Not Found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
