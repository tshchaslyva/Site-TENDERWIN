/* TenderWin — робочий інструмент Віталія: реєстр заявок, прийняття замовлення, рахунок, оплата, консультація.
   Усі дані з форми сайту показуються лише як текст (textContent), без вставлення HTML. */
(function () {
  "use strict";

  var KEY = "tw-admin";
  var state = { filter: "open", token: "" };
  try { state.token = sessionStorage.getItem(KEY) || ""; } catch (e) { /* */ }

  var $ = function (id) { return document.getElementById(id); };
  var flash = $("flash"), loginForm = $("login"), list = $("list"), detail = $("detail"), tabs = $("tabs"), statsSec = $("stats");

  /** h("tag", {attrs}, ...children) — безпечне створення елементів */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "onclick" || k === "onsubmit" || k === "onchange") el[k] = v;
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) el.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
      else el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function say(text, kind) {
    clear(flash);
    if (text) flash.appendChild(h("p", { class: "alert " + (kind || "ok") }, text));
  }

  var fmt = new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  function dt(ms) { return ms ? fmt.format(new Date(ms)) : "—"; }
  function localInput(ms) {   // для <input type="datetime-local"> у часовому поясі браузера
    var d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  }

  var INTAKE = { received: "нова", clarification_needed: "потрібні уточнення", accepted: "прийнято", declined: "відхилено" };
  var STAGE = { "new": "очікує рішення", awaiting_payment: "очікує оплату", analysis_in_progress: "аналіз у роботі", analysis_delivered: "аналіз передано" };
  var CONSULT = { "": "—", to_schedule: "погодити час", scheduled: "призначено", reschedule_requested: "перенесення", completed: "проведено" };
  var EVENT = {
    submitted: "заявку збережено", mail_accepted: "лист прийнято поштою", mail_retry: "лист: повтор пізніше", mail_failed: "лист не надіслано",
    clarify: "потрібні уточнення", decline: "заявку відхилено", accept: "замовлення прийнято", accept_manual: "прийнято, рахунок вручну",
    invoice_number: "номер рахунку", resend_invoice: "рахунок надіслано повторно", paid: "оплату зараховано", delivered: "аналіз передано",
    consult_to_schedule: "консультація: погодити час", consult_scheduled: "консультацію призначено", consult_reschedule_requested: "консультація: перенесення",
    consult_completed: "консультацію проведено", note: "нотатка", retry_mail: "повтор листа"
  };
  var MAIL = { pending: "у черзі", sending: "надсилається", accepted: "прийнято поштою", failed: "не надіслано", held: "притримано" };

  function api(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || "GET",
      headers: { Authorization: "Bearer " + state.token, "Content-Type": "application/json", Accept: "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store"
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: "Сервер повернув не JSON (" + r.status + ")." }; })
        .then(function (j) { j.httpStatus = r.status; return j; });
    }).then(function (j) {
      if (j.httpStatus === 401) { logout("Неправильний пароль."); throw new Error("auth"); }
      return j;
    });
  }

  function logout(text) {
    state.token = "";
    try { sessionStorage.removeItem(KEY); } catch (e) { /* */ }
    tabs.hidden = true; list.hidden = true; detail.hidden = true; statsSec.hidden = true; loginForm.hidden = false;
    say(text || "", text ? "err" : "");
  }

  loginForm.onsubmit = function (e) {
    e.preventDefault();
    state.token = $("token").value.trim();
    try { sessionStorage.setItem(KEY, state.token); } catch (err) { /* */ }
    $("token").value = "";
    start();
  };
  $("logout").onclick = function () { logout(""); };
  $("refresh").onclick = function () { route(); };
  Array.prototype.forEach.call(tabs.querySelectorAll("[data-filter]"), function (b) {
    b.onclick = function () {
      state.filter = b.getAttribute("data-filter");
      Array.prototype.forEach.call(tabs.querySelectorAll("[data-filter]"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      if (location.hash) history.pushState(null, "", location.pathname);
      route();
    };
  });
  $("statsBtn").onclick = function () { location.hash = "stats"; };
  window.addEventListener("hashchange", route);

  function start() {
    if (!state.token) { logout(""); return; }
    loginForm.hidden = true; tabs.hidden = false;
    route();
  }

  function route() {
    var id = decodeURIComponent(location.hash.slice(1));
    $("statsBtn").setAttribute("aria-pressed", String(id === "stats"));
    Array.prototype.forEach.call(tabs.querySelectorAll("[data-filter]"), function (x) {
      x.setAttribute("aria-pressed", String(id !== "stats" && x.getAttribute("data-filter") === state.filter));
    });
    statsSec.hidden = id !== "stats";
    if (id === "stats") { list.hidden = true; detail.hidden = true; showStats(); }
    else if (id) showDetail(id); else showList();
  }

  // ---------------- список ----------------
  function showList() {
    detail.hidden = true; list.hidden = false;
    clear(list);
    list.appendChild(h("p", { class: "muted", text: "Завантаження…" }));
    api("/api/admin/applications?filter=" + encodeURIComponent(state.filter)).then(function (j) {
      clear(list);
      if (!j.ok) { say(j.error || "Помилка", "err"); return; }
      list.appendChild(healthCard(j));
      if (j.blockers && j.blockers.length) list.appendChild(h("p", { class: "alert warn" }, "Автоматичні рахунки вимкнено: " + j.blockers.join("; ") + ". Замовлення можна прийняти й надіслати рахунок вручну."));
      if (j.globalFailed) list.appendChild(h("p", { class: "alert err" }, "Службових листів не надіслано: " + j.globalFailed + ". Перевірте ключ Resend."));
      var rows = (j.items || []).map(function (a) {
        var tags = [];
        if (a.mail_problems) tags.push(h("span", { class: "tag err" }, "листи: " + a.mail_problems));
        (a.flags ? a.flags.split(",") : []).forEach(function (f) { tags.push(h("span", { class: "tag warn" }, f.indexOf("dup:") === 0 ? "можливий дублікат" : f)); });
        if (a.stage === "analysis_in_progress" && a.analysis_due_at) tags.push(h("span", { class: "tag" + (a.analysis_due_at - Date.now() < 3 * 3600000 ? " err" : "") }, "до " + dt(a.analysis_due_at)));
        var tr = h("tr", { class: "row", tabindex: "0" },
          h("td", null, h("b", { text: a.id }), h("br"), h("span", { class: "muted", text: dt(a.created) })),
          h("td", null, h("span", { text: a.org }), h("br"), h("span", { class: "muted", text: a.name + " · " + a.email })),
          h("td", { text: a.tender }),
          h("td", null, h("span", { text: INTAKE[a.intake] || a.intake }), h("br"), h("span", { class: "muted", text: STAGE[a.stage] || a.stage })),
          h("td", null, tags));
        var open = function () { location.hash = encodeURIComponent(a.id); };
        tr.onclick = open;
        tr.addEventListener("keydown", function (e) { if (e.key === "Enter") open(); });
        return tr;
      });
      list.appendChild(h("div", { class: "card scroll" },
        rows.length
          ? h("table", null, h("thead", null, h("tr", null, h("th", { text: "Заявка" }), h("th", { text: "Учасник / контакт" }), h("th", { text: "Закупівля" }), h("th", { text: "Стан" }), h("th", { text: "Позначки" }))), h("tbody", null, rows))
          : h("p", { class: "muted", text: "Заявок немає." })));
    }).catch(function (e) { if (e.message !== "auth") say("Немає зв’язку з сервером.", "err"); });
  }

  /** Підказка до типових помилок Resend */
  function mailHint(err) {
    if (/RESEND_API_KEY/.test(err)) return "Додайте секрет RESEND_API_KEY: Cloudflare → site-tenderwin → Settings → Variables and Secrets (блок для роботи сайту, не Build) → Type: Secret → Deploy.";
    if (/Resend 40[13]/.test(err) && /domain|домен/i.test(err)) return "Домен tenderwin.in.ua не підтверджено в Resend або ключ створено для іншого домену. Перевірте Resend → Domains (статус Verified) і права ключа.";
    if (/Resend 40[13]/.test(err)) return "Resend не приймає ключ: він неправильний, видалений або без права надсилання. Створіть новий ключ (Sending access, домен tenderwin.in.ua) і замініть секрет RESEND_API_KEY.";
    if (/Resend 422/.test(err)) return "Resend відхилив дані листа (адреса одержувача чи відправника). Перевірте адресу в заявці та MAIL_FROM у wrangler.jsonc.";
    if (/Resend 429/.test(err)) return "Перевищено ліміт Resend (безкоштовно — 100 листів на добу). Листи повторяться автоматично пізніше.";
    return "Листи повторюються автоматично; кнопка «Повторити» — у картці заявки.";
  }

  function healthCard(j) {
    var m = j.mail || {};
    var rows = [];
    rows.push(h("p", null, h("b", { text: "Пошта: " }),
      m.configured ? h("span", { class: "tag ok", text: "ключ є" }) : h("span", { class: "tag err", text: "не налаштовано" }),
      m.from ? " відправник " + m.from : "",
      m.lastAcceptedAt ? " · останній лист прийнято " + dt(m.lastAcceptedAt) : " · ще жодного прийнятого листа",
      m.waiting ? " · у черзі: " + m.waiting : ""));
    if (!m.configured) rows.push(h("p", { class: "alert err", text: mailHint("RESEND_API_KEY") }));
    else if (m.lastError) rows.push(h("div", { class: "alert err" },
      h("div", { text: "Остання помилка пошти (" + dt(m.lastErrorAt) + "): " + m.lastError }),
      h("div", { style: "margin-top:6px;font-weight:500", text: mailHint(m.lastError) })));
    rows.push(h("p", null, h("b", { text: "Рахунки: " }),
      j.blockers && j.blockers.length ? h("span", { class: "tag warn", text: "вручну" }) : h("span", { class: "tag ok", text: "автоматично після «Прийняти»" })));
    return h("div", { class: "card" }, h("h2", { text: "Стан налаштувань" }), rows);
  }

  // ---------------- картка заявки ----------------
  function showDetail(id) {
    list.hidden = true; detail.hidden = false;
    clear(detail);
    detail.appendChild(h("p", { class: "muted", text: "Завантаження…" }));
    api("/api/admin/applications/" + encodeURIComponent(id)).then(function (j) {
      clear(detail);
      if (!j.ok) { say(j.error || "Помилка", "err"); return; }
      renderDetail(j);
    }).catch(function (e) { if (e.message !== "auth") say("Немає зв’язку з сервером.", "err"); });
  }

  function act(id, action, params, btn) {
    if (btn) btn.disabled = true;
    return api("/api/admin/applications/" + encodeURIComponent(id) + "/action", { method: "POST", body: { action: action, params: params || {} } })
      .then(function (j) {
        say(j.ok ? j.message : (j.error || "Помилка"), j.ok ? "ok" : "err");
        showDetail(id);
        window.scrollTo(0, 0);
      })
      .catch(function (e) { if (e.message !== "auth") say("Немає зв’язку з сервером.", "err"); })
      .then(function () { if (btn) btn.disabled = false; });
  }

  function renderDetail(j) {
    var a = j.app;
    detail.appendChild(h("p", null, h("a", { href: "#", onclick: function (e) { e.preventDefault(); history.pushState(null, "", location.pathname); route(); } }, "← До списку")));

    if (j.flags && j.flags.length) detail.appendChild(h("div", { class: "alert warn" }, j.flags.map(function (f) { return h("div", { text: "• " + f }); })));

    detail.appendChild(h("div", { class: "card" },
      h("h2", { text: "Заявка № " + a.id }),
      h("dl", null,
        h("dt", { text: "Надійшла" }), h("dd", { text: dt(a.created) }),
        h("dt", { text: "Стан приймання" }), h("dd", { text: INTAKE[a.intake] || a.intake }),
        h("dt", { text: "Етап" }), h("dd", { text: STAGE[a.stage] || a.stage }),
        h("dt", { text: "Ім’я" }), h("dd", { text: a.name }),
        h("dt", { text: "Електронна пошта" }), h("dd", null, h("a", { href: "mailto:" + a.email, text: a.email })),
        h("dt", { text: "Телефон / Telegram" }), h("dd", { text: a.contact || "—" }),
        h("dt", { text: "Учасник" }), h("dd", { text: a.org }),
        h("dt", { text: "Код" }), h("dd", { text: a.code || (a.no_code ? "немає — уточнити" : "—") }),
        h("dt", { text: "Платник" }), h("dd", { text: a.other_payer ? "інший, ніж учасник — уточнити" : "учасник" }),
        h("dt", { text: "Закупівля" }), h("dd", null, h("a", { href: "https://prozorro.gov.ua/tender/" + encodeURIComponent(a.tender), target: "_blank", rel: "noopener noreferrer", text: a.tender })),
        h("dt", { text: "Лот / рішення" }), h("dd", { text: a.lot || "—" }),
        h("dt", { text: "Коротко про ситуацію" }), h("dd", { text: a.message || "—" }),
        h("dt", { text: "Рахунок" }), h("dd", { text: j.invoice ? j.invoice.number + " · " + j.invoice.amount + " грн · дійсний до " + dt(j.invoice.valid_until) : "—" }),
        h("dt", { text: "Оплату зараховано" }), h("dd", { text: dt(a.paid_at) }),
        h("dt", { text: "Строк аналізу" }), h("dd", { text: dt(a.analysis_due_at) }),
        h("dt", { text: "Аналіз передано" }), h("dd", { text: dt(a.analysis_delivered_at) }),
        h("dt", { text: "Консультація (30 хв)" }), h("dd", { text: (CONSULT[a.consult_status] || a.consult_status) + (a.consult_at ? " · " + dt(a.consult_at) : "") }),
        h("dt", { text: "Нотатки" }), h("dd", { text: a.notes || "—" }),
        h("dt", { text: "Версія послуги" }), h("dd", { text: a.service_version || "—" }))));

    // ----- дії -----
    var acts = h("div", { class: "actions" });

    if (a.intake !== "accepted" && a.intake !== "declined") {
      var payer = h("input", { id: "p-name", value: a.org, style: "width:100%" });
      var pcode = h("input", { id: "p-code", value: a.code || "", inputmode: "numeric", maxlength: "10" });
      var plot = h("input", { id: "p-lot", value: a.lot || "", style: "width:100%" });
      var defDays = j.validDays || 2;
      var until = h("input", { id: "p-until", type: "date", value: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(new Date(Date.now() + defDays * 86400000)) });
      var manual = j.blockers && j.blockers.length;
      var bAccept = h("button", { class: "primary", type: "button" }, manual ? "Прийняти (рахунок — вручну)" : "Прийняти й надіслати рахунок");
      bAccept.onclick = function () {
        if (!confirm(manual ? "Прийняти замовлення без автоматичного рахунку?" : "Створити рахунок і надіслати його клієнту на " + a.email + "?")) return;
        act(a.id, "accept", {
          buyerName: payer.value, buyerCode: pcode.value, lot: plot.value,
          validUntilDate: until.value || undefined,
          withoutInvoice: !!manual
        }, bAccept);
      };
      acts.appendChild(h("div", { class: "card" },
        h("h3", { text: "Прийняти замовлення" }),
        h("p", { class: "muted", text: "Перед цим перевірте учасника, рішення/лот, документи, строк оскарження і свою завантаженість." }),
        manual ? h("p", { class: "alert warn", text: "Автоматичний рахунок недоступний: " + j.blockers.join("; ") + "." }) : null,
        h("label", { for: "p-name", text: "Платник у рахунку" }), payer,
        h("label", { for: "p-code", text: "Код платника (ЄДРПОУ або РНОКПП)" }), pcode,
        h("label", { for: "p-lot", text: "Лот / рішення (для предмета рахунку)" }), plot,
        h("label", { for: "p-until", text: "Рахунок дійсний до" }), until,
        h("div", { class: "row-btns" }, bAccept)));

      var note1 = h("textarea", { "aria-label": "Що уточнити" });
      var bClar = h("button", { type: "button" }, "Потрібні уточнення");
      bClar.onclick = function () { act(a.id, "clarify", { note: note1.value }, bClar); };
      var bDecl = h("button", { class: "danger", type: "button" }, "Відхилити заявку");
      bDecl.onclick = function () { if (confirm("Відхилити заявку " + a.id + "? Клієнту лист не надсилається — повідомте його самі.")) act(a.id, "decline", { note: note1.value }, bDecl); };
      acts.appendChild(h("div", { class: "card" }, h("h3", { text: "Уточнення або відмова" }),
        h("p", { class: "muted", text: "Причина (для журналу):" }), note1, h("div", { class: "row-btns" }, bClar, bDecl)));
    }

    if (j.invoice) {
      var bRe = h("button", { type: "button" }, "Надіслати рахунок повторно");
      bRe.onclick = function () { if (confirm("Надіслати рахунок № " + j.invoice.number + " ще раз (номер не зміниться)?")) act(a.id, "resend_invoice", {}, bRe); };
      acts.appendChild(h("div", { class: "card" }, h("h3", { text: "Рахунок № " + j.invoice.number }),
        h("p", { class: "muted", text: j.invoice.item }), h("div", { class: "row-btns" }, bRe)));
    }

    if (a.intake === "accepted" && !a.paid_at) {
      var paidAt = h("input", { id: "p-paid", type: "datetime-local", value: localInput(Date.now()) });
      var bPaid = h("button", { class: "primary", type: "button" }, "Оплату зараховано");
      bPaid.onclick = function () {
        if (!confirm("Позначити оплату? Клієнт отримає лист зі строком аналізу (24 години від зарахування).")) return;
        act(a.id, "paid", { paidAt: paidAt.value ? new Date(paidAt.value).getTime() : undefined }, bPaid);
      };
      acts.appendChild(h("div", { class: "card" }, h("h3", { text: "Оплата" }),
        h("p", { class: "muted", text: "Позначайте лише після фактичного зарахування на рахунок (скриншот платіжки — не підтвердження)." }),
        h("label", { for: "p-paid", text: "Час зарахування" }), paidAt, h("div", { class: "row-btns" }, bPaid)));
    }

    if (a.paid_at && !a.analysis_delivered_at) {
      var bDel = h("button", { class: "primary", type: "button" }, "Аналіз передано клієнту");
      bDel.onclick = function () { if (confirm("Позначити, що письмовий аналіз надіслано клієнту?")) act(a.id, "delivered", {}, bDel); };
      acts.appendChild(h("div", { class: "card" }, h("h3", { text: "Аналіз" }),
        h("p", { class: "muted", text: "Аналіз надсилайте зі своєї пошти; тут лише позначте факт передання." }), h("div", { class: "row-btns" }, bDel)));
    }

    if (a.analysis_delivered_at) {
      var cs = h("select", { id: "p-cs" }, ["to_schedule", "scheduled", "reschedule_requested", "completed"].map(function (v) {
        return h("option", { value: v, selected: a.consult_status === v }, CONSULT[v]);
      }));
      var cat = h("input", { id: "p-cat", type: "datetime-local", value: a.consult_at ? localInput(a.consult_at) : "" });
      var bCs = h("button", { type: "button" }, "Зберегти");
      bCs.onclick = function () { act(a.id, "consult", { status: cs.value, at: cat.value ? new Date(cat.value).getTime() : undefined }, bCs); };
      acts.appendChild(h("div", { class: "card" }, h("h3", { text: "Консультація 30 хвилин" }),
        h("label", { for: "p-cs", text: "Стан" }), cs, h("label", { for: "p-cat", text: "Дата й час" }), cat, h("div", { class: "row-btns" }, bCs)));
    }

    var note = h("textarea", { "aria-label": "Нотатка" });
    var bNote = h("button", { type: "button" }, "Додати нотатку");
    bNote.onclick = function () { act(a.id, "note", { note: note.value }, bNote); };
    acts.appendChild(h("div", { class: "card" }, h("h3", { text: "Нотатка" }), note, h("div", { class: "row-btns" }, bNote)));
    detail.appendChild(acts);

    // ----- листи -----
    detail.appendChild(h("div", { class: "card scroll", style: "margin-top:16px" },
      h("h2", { text: "Листи" }),
      h("p", { class: "muted", text: "«Прийнято поштою» означає, що Resend прийняв лист, а не що його вже прочитали. Повтор не створює нового рахунку." }),
      h("table", null,
        h("thead", null, h("tr", null, h("th", { text: "Лист" }), h("th", { text: "Кому" }), h("th", { text: "Стан" }), h("th", { text: "Спроб" }), h("th", { text: "" }))),
        h("tbody", null, j.mails.map(function (m) {
          var b = null;
          if (m.status !== "accepted" && m.status !== "sending") {
            b = h("button", { type: "button" }, m.status === "held" ? "Надіслати" : "Повторити");
            b.onclick = function () { act(a.id, "retry_mail", { mailId: m.id }, b); };
          }
          var cls = m.status === "accepted" ? "ok" : m.status === "failed" ? "err" : "warn";
          return h("tr", null,
            h("td", { text: m.label }),
            h("td", { text: m.to_addr }),
            h("td", null, h("span", { class: "tag " + cls, text: MAIL[m.status] || m.status }),
              m.hold_reason ? h("div", { class: "muted", text: "причина: " + m.hold_reason }) : null,
              m.last_error ? h("div", { class: "muted", text: m.last_error }) : null,
              m.status === "pending" && m.next_at ? h("div", { class: "muted", text: "наступна спроба: " + dt(m.next_at) }) : null),
            h("td", { text: String(m.attempts) }),
            h("td", null, b));
        })))));

    // ----- журнал -----
    detail.appendChild(h("div", { class: "card" }, h("h2", { text: "Журнал" }),
      h("ul", null, j.events.map(function (ev) { return h("li", { text: dt(ev.ts) + " — " + (EVENT[ev.action] || ev.action) + (ev.detail ? ": " + ev.detail : "") }); }))));
  }

  // ---------------- статистика відвідувань ----------------
  var statDays = 30;
  var dayFmt = new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit" });
  function dayLabel(iso) { return dayFmt.format(new Date(iso + "T12:00:00Z")); }
  function num(n) { return String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0"); }

  function ownToggle() {
    var off = false;
    try { off = localStorage.getItem("tw-no-stats") === "1"; } catch (e) { /* */ }
    var b = h("button", { type: "button" }, off ? "Знову враховувати мої відвідування" : "Не враховувати мої відвідування з цього браузера");
    b.onclick = function () {
      try { if (off) localStorage.removeItem("tw-no-stats"); else localStorage.setItem("tw-no-stats", "1"); } catch (e) { /* */ }
      showStats();
    };
    return h("p", { class: "muted" }, off ? "Ваші відвідування з цього браузера не враховуються. " : "Ваші відвідування з цього браузера зараз враховуються. ", b);
  }

  /** Стовпчики «відвідувачі за день»; підказка при наведенні й фокусі */
  function chart(series, width) {
    var W = Math.max(300, Math.round(width || 720)), H = 220, L = 34, B = 24, T = 10;
    var max = Math.max(1, Math.max.apply(null, series.map(function (d) { return d.visitors; })));
    var step = Math.pow(10, Math.floor(Math.log10(max)));
    var top = Math.ceil(max / step) * step; if (top / step > 5) step *= 2;
    var bw = (W - L) / series.length;
    var NS = "http://www.w3.org/2000/svg";
    function sv(tag, attrs, text) {
      var el = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      if (text !== undefined) el.textContent = text;
      return el;
    }
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Відвідувачі за день" });
    for (var v = 0; v <= top; v += step) {
      var y = T + (H - B - T) * (1 - v / top);
      svg.appendChild(sv("line", { class: "grid", x1: L, x2: W, y1: y, y2: y }));
      svg.appendChild(sv("text", { class: "ax", x: L - 6, y: y + 4, "text-anchor": "end" }, String(v)));
    }
    var every = Math.ceil(series.length / 8);
    series.forEach(function (d, i) {
      var hgt = (H - B - T) * d.visitors / top, x = L + i * bw + Math.max(1, bw * 0.15);
      var w = Math.max(2, bw * 0.7);
      svg.appendChild(sv("rect", { class: "bar", x: x, y: H - B - hgt, width: w, height: Math.max(0, hgt), rx: Math.min(4, w / 2), "data-i": i }));
      var lastI = series.length - 1;
      if (i === lastI || (i % every === 0 && lastI - i >= Math.ceil(every / 2))) svg.appendChild(sv("text", { class: "ax", x: i === lastI ? x + w : x + w / 2, y: H - 6, "text-anchor": i === lastI ? "end" : "middle" }, dayLabel(d.day)));
    });
    var tip = h("div", { class: "tip", role: "status" });
    var wrap = h("div", { class: "chart", tabindex: "0", "aria-label": "Графік відвідувачів за день. Стрілками вліво й вправо — дні." }, svg, tip);
    var cur = -1;
    function show(i) {
      if (i < 0 || i >= series.length) return;
      cur = i;
      var d = series[i], r = wrap.getBoundingClientRect();
      Array.prototype.forEach.call(svg.querySelectorAll(".bar"), function (b) { b.setAttribute("class", "bar" + (Number(b.getAttribute("data-i")) === i ? " hl" : "")); });
      tip.textContent = dayLabel(d.day) + ": відвідувачів " + d.visitors + ", переглядів " + d.views + (d.form_start ? ", почали форму " + d.form_start : "");
      tip.style.display = "block";
      tip.style.left = ((L + (i + 0.5) * bw) / W * r.width) + "px";
      tip.style.top = "0px";
    }
    function hide() { tip.style.display = "none"; Array.prototype.forEach.call(svg.querySelectorAll(".bar.hl"), function (b) { b.setAttribute("class", "bar"); }); }
    wrap.addEventListener("mousemove", function (e) {
      var r = wrap.getBoundingClientRect();
      show(Math.floor(((e.clientX - r.left) / r.width * W - L) / bw));
    });
    wrap.addEventListener("mouseleave", hide);
    wrap.addEventListener("blur", hide);
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); show(Math.min(series.length - 1, cur + 1)); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(Math.max(0, cur < 0 ? series.length - 1 : cur - 1)); }
    });
    return wrap;
  }

  function topTable(title, rows, total, empty) {
    return h("div", { class: "card scroll" }, h("h3", { text: title }),
      rows && rows.length
        ? h("table", null, h("tbody", null, rows.map(function (r) {
            var share = total ? Math.round(r.n / total * 100) : 0;
            return h("tr", null, h("td", null, h("span", { text: r.key || "—" }), h("div", { class: "meter" }, h("i", { style: "width:" + share + "%" }))),
              h("td", { class: "num", text: num(r.n) }), h("td", { class: "num muted", text: share + "%" }));
          })))
        : h("p", { class: "muted", text: empty || "Ще немає даних." }));
  }

  function showStats() {
    clear(statsSec);
    statsSec.appendChild(h("p", { class: "muted", text: "Завантаження…" }));
    api("/api/admin/stats?days=" + statDays).then(function (j) {
      clear(statsSec);
      if (!j.ok) { say(j.error || "Помилка", "err"); return; }
      var t = j.totals, f = j.funnel;
      var range = h("div", { class: "row-btns", style: "margin:0 0 14px" }, [7, 30, 90, 365].map(function (d) {
        var b = h("button", { type: "button", "aria-pressed": String(d === statDays) }, d === 365 ? "Рік" : d + " днів");
        b.onclick = function () { statDays = d; showStats(); };
        return b;
      }));
      statsSec.appendChild(h("div", { class: "card" },
        h("h2", { text: "Статистика відвідувань" }),
        h("p", { class: "muted", text: "Бачите лише Ви (вхід за паролем). Без файлів cookie: рахуємо перегляди сторінки та дії. «Відвідувачі» — приблизна кількість різних людей за кожен день; IP-адреси не зберігаються. Пошукові роботи й попередній перегляд посилань у месенджерах не враховуються." }),
        range, ownToggle()));
      statsSec.appendChild(h("div", { class: "tiles" },
        [[t.visitors, "відвідувачів"], [t.views, "переглядів сторінки"], [t.report, "відкрили зразок аналізу"],
         [t.form_start, "почали заповнювати форму"], [f.applications, "заявок збережено"], [t.call + t.tg, "натиснули «дзвінок» або Telegram"]]
          .map(function (x) { return h("div", { class: "tile" }, h("b", { text: num(x[0]) }), h("span", { text: x[1] })); })));
      statsSec.appendChild(h("div", { class: "card" }, h("h3", { text: "Відвідувачі за день" }), chart(j.series, statsSec.clientWidth - 42)));
      var steps = [["Відвідувачі", t.visitors], ["Відкрили зразок аналізу", t.report], ["Почали заповнювати форму", t.form_start],
        ["Заявки збережено", f.applications], ["Замовлення прийнято", f.accepted], ["Рахунки створено", f.invoices],
        ["Оплату зараховано", f.paid], ["Аналіз передано", f.delivered], ["Консультації проведено", f.consultations]];
      statsSec.appendChild(h("div", { class: "card scroll" }, h("h3", { text: "Шлях клієнта за період" }),
        h("p", { class: "muted", text: "Перші три рядки — з сайту (кожен відвідувач рахується один раз за день), решта — з реєстру заявок. Перехід до дзвінка не дорівнює розмові, а заявка — продажу." }),
        h("table", null, h("tbody", null, steps.map(function (s) { return h("tr", null, h("td", { text: s[0] }), h("td", { class: "num", text: num(s[1]) })); })))));
      statsSec.appendChild(h("div", { class: "two" },
        topTable("Звідки приходять", j.refs, t.views, "Ще немає переходів."),
        topTable("Пристрої", j.devices, t.views),
        topTable("Країни", j.countries, t.views),
        topTable("Сторінки", j.pages, t.views),
        topTable("Мітки utm_source (реклама, розсилки)", j.sources, t.views, "Немає переходів із мітками utm_source.")));
      var dayRows = j.series.slice().reverse().map(function (d) {
        return h("tr", null, h("td", { text: dayLabel(d.day) }), h("td", { class: "num", text: num(d.visitors) }), h("td", { class: "num", text: num(d.views) }),
          h("td", { class: "num", text: num(d.report) }), h("td", { class: "num", text: num(d.form_start) }), h("td", { class: "num", text: num(d.call + d.tg) }));
      });
      statsSec.appendChild(h("details", { class: "card scroll" }, h("summary", { text: "Таблиця за днями" }),
        h("table", null, h("thead", null, h("tr", null, h("th", { text: "День" }), h("th", { class: "num", text: "Відвідувачі" }), h("th", { class: "num", text: "Перегляди" }),
          h("th", { class: "num", text: "Зразок" }), h("th", { class: "num", text: "Почали форму" }), h("th", { class: "num", text: "Дзвінок / Telegram" }))), h("tbody", null, dayRows))));
    }).catch(function (e) { if (e.message !== "auth") say("Немає зв’язку з сервером.", "err"); });
  }

  start();
})();
