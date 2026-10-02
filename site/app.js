/* ================================================================
   TenderWin — поведінка сторінки.
   Тексти сайту редагуються в index.html; цей файл змінювати не потрібно.
   Контакти нижче мають збігатися з contacts.json (це перевіряє npm test).
   ================================================================ */
(function () {
  "use strict";

  var CONTACTS = {
    phone: "+380 800 357 135",
    phoneHref: "tel:+380800357135",
    email: "vitalii@tenderwin.com.ua",
    telegramUser: "TenderWin_UA",
    telegramUrl: "https://t.me/tenderwin_ua",
    telegramPrefill: "Доброго дня! Хочу замовити аналіз відхилення. ID закупівлі: UA-… ЄДРПОУ/РНОКПП: …",
    channelUrl: "https://t.me/tenderwin_plus",
    channelLabel: "Тендер+ — щотижневий розбір відхилень"
  };
  var MESSAGE_MAX = 2000;          // так само в обробнику (worker/index.js)
  var REQUEST_TIMEOUT = 15000;     // мс очікування відповіді обробника

  var root = document.documentElement;

  /* ---------- рік у футері ---------- */
  var y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());

  /* ---------- тінь шапки під час прокрутки ---------- */
  var header = document.getElementById("header");
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- плавна поява блоків (без неї весь зміст теж видно) ---------- */
  try {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var items = document.querySelectorAll("[data-reveal]");
    if (!reduce && "IntersectionObserver" in window && items.length) {
      root.classList.add("js");
      var vh = window.innerHeight || 800;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      Array.prototype.forEach.call(items, function (el, i) {
        if (el.getBoundingClientRect().top < vh) el.classList.add("in");
        else { el.style.transitionDelay = (i % 3) * 70 + "ms"; io.observe(el); }
      });
      // запобіжник: якщо спостерігач не спрацював, показуємо все через 3 с
      setTimeout(function () { Array.prototype.forEach.call(items, function (el) { el.classList.add("in"); }); }, 3000);
    }
  } catch (e) { root.classList.remove("js"); }

  /* ---------- Telegram: контакт @TenderWin_UA і канал «Тендер+» ---------- */
  var TG_RE = /^https:\/\/t\.me\/[a-z][a-z0-9_]{4,31}$/;
  function setupTelegram(kind, url, prefill) {
    var ok = typeof url === "string" && TG_RE.test(url);
    if (!ok) console.warn("TenderWin: посилання Telegram (" + kind + ") не задано або має неправильний формат — приховано.");
    Array.prototype.forEach.call(document.querySelectorAll('[data-tg="' + kind + '"]'), function (a) {
      if (!ok) { a.hidden = true; return; }
      a.href = url + (prefill && a.hasAttribute("data-prefill") ? "?text=" + encodeURIComponent(prefill) : "");
    });
    if (!ok) Array.prototype.forEach.call(document.querySelectorAll('[data-tg-wrap="' + kind + '"]'), function (w) { w.hidden = true; });
    return ok;
  }
  var tgOk = setupTelegram("contact", CONTACTS.telegramUrl, CONTACTS.telegramPrefill);
  var chOk = setupTelegram("channel", CONTACTS.channelUrl, "");

  /* ---------- мобільна панель ховається біля форми, щоб не перекривати поля ---------- */
  var bar = document.getElementById("mobilebar");
  var formSec = document.getElementById("zayavka");
  if (bar && formSec && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { bar.classList.toggle("away", e.isIntersecting); });
    }, { threshold: 0.01 }).observe(formSec);
  }

  /* ================================================================
     ФОРМА ЗАЯВКИ
     1) Основний канал — обробник /api/zayavka: заявку зберігають у реєстрі,
        потім надсилають листи. Повтор із тим самим ключем операції не створює
        другої заявки.
     2) Резервний канал Web3Forms — лише коли обробник не зміг зберегти заявку
        або недоступний (тайм-аут, мережа, 5xx після повторної перевірки).
        На помилки перевірки даних (400), заборону (403), конфлікт (409)
        і обмеження (429) резервний канал не застосовується.
     ================================================================ */
  var form = document.getElementById("leadform");
  if (!form) return;
  form.noValidate = true;     // перевіряємо самі й показуємо помилки біля полів

  var msg = document.getElementById("formmsg");
  var btn = form.querySelector('button[type="submit"]');
  var btnText = btn ? btn.textContent : "";
  var loadedAt = Date.now();

  var F = {
    name: document.getElementById("f-name"),
    email: document.getElementById("f-mail"),
    tender: document.getElementById("f-tender"),
    org: document.getElementById("f-org"),
    code: document.getElementById("f-code"),
    noCode: document.getElementById("f-nocode"),
    lot: document.getElementById("f-lot"),
    contact: document.getElementById("f-contact"),
    message: document.getElementById("f-msg"),
    otherPayer: document.getElementById("f-payer"),
    consent: document.getElementById("f-consent")
  };
  var bot = form.elements["botcheck"];

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var contactsHtml =
    'Телефон: <a href="' + CONTACTS.phoneHref + '">' + CONTACTS.phone.replace(/ /g, "&nbsp;") + "</a>" +
    (tgOk ? ', Telegram: <a href="' + CONTACTS.telegramUrl + '" target="_blank" rel="noopener">@' + CONTACTS.telegramUser + "</a>" : "") +
    ', пошта: <a href="mailto:' + CONTACTS.email + '">' + CONTACTS.email + "</a>.";
  var waitHtml = (tgOk || chOk)
    ? '<span class="more">Поки чекаєте на відповідь: питання — у Telegram ' +
      (tgOk ? '<a href="' + CONTACTS.telegramUrl + '" target="_blank" rel="noopener">@' + CONTACTS.telegramUser + "</a>" : "") +
      (chOk ? '; свіжі розбори відхилень — у каналі <a href="' + CONTACTS.channelUrl + '" target="_blank" rel="noopener">Тендер+</a>' : "") +
      ".</span>"
    : "";

  function say(html, kind) {
    if (!msg) return;
    msg.innerHTML = html;
    msg.className = "formmsg" + (kind ? " " + kind : "");
  }
  function busy(on, label) {
    if (!btn) return;
    btn.disabled = on;
    btn.textContent = on ? (label || "Надсилаємо…") : btnText;
  }

  // ---------- сховище вкладки: чернетка форми й ключ операції ----------
  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* приватний режим */ } },
    del: function (k) { try { window.sessionStorage.removeItem(k); } catch (e) { /* */ } }
  };
  var DRAFT_KEYS = ["name", "email", "tender", "org", "code", "lot", "contact", "message"];
  function saveDraft() {
    var d = {};
    DRAFT_KEYS.forEach(function (k) { if (F[k]) d[k] = F[k].value; });
    d.noCode = !!(F.noCode && F.noCode.checked);
    d.otherPayer = !!(F.otherPayer && F.otherPayer.checked);
    store.set("tw-draft", JSON.stringify(d));
  }
  function restoreDraft() {
    var raw = store.get("tw-draft");
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      DRAFT_KEYS.forEach(function (k) { if (F[k] && typeof d[k] === "string" && !F[k].value) F[k].value = d[k]; });
      if (F.noCode) F.noCode.checked = !!d.noCode;
      if (F.otherPayer) F.otherPayer.checked = !!d.otherPayer;
    } catch (e) { store.del("tw-draft"); }
  }
  function newOpKey() {
    var k = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : "op-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
    store.set("tw-op", k);
    return k;
  }
  function opKey() { return store.get("tw-op") || newOpKey(); }

  restoreDraft();
  form.addEventListener("input", saveDraft);
  form.addEventListener("change", saveDraft);

  // ---------- перевірка полів (ті самі правила, що в обробнику) ----------
  function validEdrpou(c) {
    if (!/^\d{8}$/.test(c)) return false;
    var d = c.split("").map(Number), n = Number(c);
    var w = (n < 30000000 || n > 60000000) ? [1, 2, 3, 4, 5, 6, 7] : [7, 1, 2, 3, 4, 5, 6];
    var sum = 0, i;
    for (i = 0; i < 7; i++) sum += w[i] * d[i];
    var k = sum % 11;
    if (k >= 10) {
      sum = 0;
      for (i = 0; i < 7; i++) sum += (w[i] + 2) * d[i];
      k = sum % 11;
      if (k >= 10) k = 0;
    }
    return k === d[7];
  }
  function validRnokpp(c) {
    if (!/^\d{10}$/.test(c)) return false;
    var w = [-1, 5, 7, 9, 4, 6, 10, 5, 7], sum = 0;
    for (var i = 0; i < 9; i++) sum += w[i] * Number(c[i]);
    return (sum % 11) % 10 === Number(c[9]);
  }
  function parseTender(t) {
    var m = String(t || "").match(/(?:^|[^A-Za-z0-9])UA-(\d{4})-(\d{2})-(\d{2})-(\d{6})-([a-z])(?![A-Za-z0-9])/i);
    if (!m) return "";
    var yr = +m[1], mo = +m[2], dd = +m[3];
    var dt = new Date(Date.UTC(yr, mo - 1, dd));
    if (dt.getUTCFullYear() !== yr || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== dd) return "";
    if (yr < 2015 || yr > new Date().getUTCFullYear() + 1) return "";
    return "UA-" + m[1] + "-" + m[2] + "-" + m[3] + "-" + m[4] + "-" + m[5].toLowerCase();
  }
  function contactOk(s) {
    s = String(s || "").trim();
    if (!s) return true;
    var tg = s.match(/^(?:https?:\/\/)?(?:t\.me\/|telegram\.me\/|@)?([A-Za-z][A-Za-z0-9_]{4,31})\/?$/);
    if (tg && !/^\d/.test(tg[1])) return true;
    if (/^\+?[\d\s()\-]{9,20}$/.test(s)) { var n = s.replace(/\D/g, "").length; return n >= 9 && n <= 15; }
    return false;
  }

  function errEl(input) { return input ? document.getElementById(input.id + "-err") : null; }
  function setErr(input, text, warn) {
    var el = errEl(input);
    if (!input) return;
    if (text && !warn) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    if (el) { el.textContent = text || ""; el.classList.toggle("warn", !!warn); }
  }
  function clearErrors() { Object.keys(F).forEach(function (k) { setErr(F[k], ""); }); }

  var codeWarned = "";   // попередження про контрольну цифру показуємо один раз для конкретного коду

  function validate() {
    clearErrors();
    var bad = [];
    function fail(input, text) { setErr(input, text); bad.push(input); }
    var name = F.name.value.trim();
    if (name.length < 2) fail(F.name, "Вкажіть Ваше ім’я.");
    var email = F.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail(F.email, "Вкажіть коректну електронну пошту — на неї надішлемо підтвердження.");
    var tid = parseTender(F.tender.value);
    if (!tid) fail(F.tender, "Вкажіть ID закупівлі у форматі UA-2026-09-30-000123-a або вставте посилання на закупівлю.");
    else F.tender.value = tid;
    if (F.org.value.trim().length < 2) fail(F.org, "Вкажіть назву учасника або ПІБ ФОП.");
    var code = F.code.value.replace(/\D+/g, "");
    F.code.value = code;
    var checksumBad = false;
    if (!(F.noCode && F.noCode.checked)) {
      if (!/^\d{8}$|^\d{10}$/.test(code)) fail(F.code, "Код ЄДРПОУ має 8 цифр, РНОКПП — 10 цифр. Якщо коду немає, позначте «Коду немає — уточню окремо».");
      else checksumBad = !(code.length === 8 ? validEdrpou(code) : validRnokpp(code));
    }
    if (!contactOk(F.contact.value)) fail(F.contact, "Вкажіть телефон (наприклад, +380 67 123 45 67) або Telegram (@username).");
    if (F.message.value.length > MESSAGE_MAX) fail(F.message, "Скоротіть опис до " + MESSAGE_MAX + " символів.");
    if (!F.consent.checked) fail(F.consent, "Потрібна Ваша згода на обробку персональних даних.");
    // контрольна цифра — попередження: зупиняємо подання один раз, коли інших помилок уже немає
    if (checksumBad && codeWarned !== code) {
      setErr(F.code, "Схоже, у коді помилка: контрольна цифра не збігається. Перевірте цифри. Якщо код правильний, натисніть «Надіслати заявку» ще раз.", true);
      if (!bad.length) codeWarned = code;
      bad.push(F.code);
    }
    if (bad.length) { try { bad[0].focus(); } catch (e) { /* */ } }
    return !bad.length;
  }

  if (F.code) F.code.addEventListener("input", function () {
    var c = F.code.value.replace(/\D+/g, "").slice(0, 10);
    if (c !== F.code.value) F.code.value = c;
  });
  if (F.noCode) F.noCode.addEventListener("change", function () {
    F.code.disabled = F.noCode.checked;
    if (F.noCode.checked) setErr(F.code, "");
  });
  if (F.noCode && F.noCode.checked) F.code.disabled = true;
  if (F.tender) F.tender.addEventListener("change", function () {
    var id = parseTender(F.tender.value);
    if (id) { F.tender.value = id; setErr(F.tender, ""); }
  });

  function payload(op) {
    return {
      op: op,
      name: F.name.value.trim(),
      email: F.email.value.trim(),
      tender: F.tender.value.trim(),
      org: F.org.value.trim(),
      code: F.noCode && F.noCode.checked ? "" : F.code.value.trim(),
      noCode: !!(F.noCode && F.noCode.checked),
      lot: F.lot.value.trim(),
      contact: F.contact.value.trim(),
      message: F.message.value,
      otherPayer: !!(F.otherPayer && F.otherPayer.checked),
      consent: !!F.consent.checked,
      botcheck: !!(bot && bot.checked),
      elapsed: Date.now() - loadedAt
    };
  }

  // ---------- резервний канал: Web3Forms (той самий ключ операції / номер заявки) ----------
  function web3forms(p, subject) {
    var key = form.elements["access_key"] ? form.elements["access_key"].value.trim() : "";
    if (!key) return Promise.reject(new Error("no-key"));
    var data = {
      access_key: key,
      subject: subject,
      from_name: "Сайт TenderWin",
      email: p.email,
      "Ключ операції": p.op,
      "Ім’я": p.name,
      "Закупівля": p.tender,
      "Лот": p.lot || "—",
      "Учасник": p.org,
      "Код учасника": p.code || (p.noCode ? "коду немає — уточнити" : "—"),
      "Телефон або Telegram": p.contact || "—",
      "Платник": p.otherPayer ? "інший, ніж учасник — уточнити" : "учасник",
      "Ситуація": p.message || "—",
      "Згода на обробку персональних даних": "Так"
    };
    if (p.id) data["Заявка"] = p.id;
    return fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (!res || !res.success) throw new Error("web3forms");
      return res;
    });
  }

  function post(p) {
    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, REQUEST_TIMEOUT);
    return fetch("/api/zayavka", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(p),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      return r.json().catch(function () { return {}; }).then(function (res) { return { status: r.status, res: res || {} }; });
    }, function (e) { clearTimeout(timer); throw e; });
  }

  function finishSuccess(res, p) {
    var id = esc(res.id), mail = esc(res.email || p.email);
    var client = res.mail ? res.mail.client : "";
    if (client === "pending" || client === "sending" || client === "failed") {
      say("Заявку № " + id + " збережено. Підтвердження електронною поштою затримується. Повторно заповнювати форму не потрібно." + waitHtml, "ok");
    } else {
      say("Дякуємо! Заявку № " + id + " збережено. Перед оплатою підтвердимо обсяг і строк роботи. Контактна адреса: " + mail + "." + waitHtml, "ok");
    }
    // повідомлення Віталію ще не прийнято поштою — дублюємо службовим листом через Web3Forms
    var owner = res.mail ? res.mail.owner : "";
    if (owner !== "accepted" && store.get("tw-relayed") !== res.id) {
      store.set("tw-relayed", res.id);
      p.id = res.id;
      web3forms(p, "Службове: заявка № " + res.id + " збережена, лист Віталію затримується").catch(function () { /* реєстр і повтори є на сервері */ });
    }
    store.del("tw-draft");
    newOpKey();
    form.reset();
    if (F.code) F.code.disabled = false;
    codeWarned = "";
    loadedAt = Date.now();
  }

  function fallback(p, reason) {
    busy(true, "Надсилаємо резервним каналом…");
    var ref = p.op.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
    return web3forms(p, "Заявка з сайту (резервний канал, " + reason + "), код " + ref)
      .then(function () {
        say("Заявку передано резервним каналом. Код звернення: " + esc(ref) + ". Перед оплатою підтвердимо обсяг і строк роботи. Контактна адреса: " + esc(p.email) + "." + waitHtml, "ok");
        store.del("tw-draft");
        newOpKey();
        form.reset();
        loadedAt = Date.now();
      })
      .catch(function () {
        say("Не вдалося надіслати заявку. Ваші введені дані збережені в цій формі. " + contactsHtml +
            ' <button type="button" class="btn btn-line" data-retry>Спробувати ще раз</button>', "err");
      })
      .then(function () { busy(false); });
  }

  function submit(p, attempt) {
    busy(true);
    return post(p).then(function (x) {
      var res = x.res;
      if (x.status === 200 && res.ok) { finishSuccess(res, p); busy(false); return; }
      busy(false);
      if (x.status === 400) {
        var map = { name: F.name, email: F.email, tender: F.tender, org: F.org, code: F.code, contact: F.contact, message: F.message, consent: F.consent };
        if (res.field && map[res.field]) { setErr(map[res.field], res.error); try { map[res.field].focus(); } catch (e) { /* */ } say("Перевірте позначене поле.", "err"); }
        else say(esc(res.error || "Перевірте дані форми."), "err");
        return;
      }
      if (x.status === 403) { say("Не вдалося надіслати заявку з цієї сторінки. Оновіть сторінку (Ctrl+F5) і спробуйте ще раз. " + contactsHtml, "err"); return; }
      if (x.status === 409) {
        say(esc(res.error || "Цю заявку вже збережено з іншими даними.") +
            ' <button type="button" class="btn btn-line" data-new>Надіслати як нову заявку</button>', "err");
        return;
      }
      if (x.status === 413) { say(esc(res.error || "Завеликий запит. Скоротіть опис ситуації."), "err"); return; }
      if (x.status === 429) { say(esc(res.error || "Забагато заявок.") + " " + contactsHtml, "err"); return; }
      if (x.status === 503 && res.saved === false) { return fallback(p, "обробник не зберіг заявку"); }
      throw new Error("http-" + x.status);
    }).catch(function () {
      // невідомо, чи збережено: перевіряємо повтором із тим самим ключем, потім — резервний канал
      if (attempt < 2) {
        busy(true, "Перевіряємо статус…");
        say("Не вдалося підтвердити статус заявки. Перевіряємо його. Ваші введені дані збережені в цій формі.", "info");
        return new Promise(function (ok) { setTimeout(ok, 2500 * (attempt + 1)); }).then(function () { return submit(p, attempt + 1); });
      }
      return fallback(p, "статус основного каналу невідомий");
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (btn && btn.disabled) return;
    say("", "");
    if (!validate()) { say("Перевірте позначені поля.", "err"); return; }
    submit(payload(opKey()), 0);
  });

  if (msg) msg.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.hasAttribute && t.hasAttribute("data-new")) { newOpKey(); say("", ""); submit(payload(opKey()), 0); }
    if (t && t.hasAttribute && t.hasAttribute("data-retry")) { say("", ""); submit(payload(opKey()), 0); }
  });
})();
