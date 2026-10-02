/* TenderWin — робочий інструмент Віталія: реєстр заявок, прийняття замовлення, рахунок, оплата, консультація.
   Усі дані з форми сайту показуються лише як текст (textContent), без вставлення HTML. */
(function () {
  "use strict";

  var KEY = "tw-admin";
  var state = { filter: "open", token: "" };
  try { state.token = sessionStorage.getItem(KEY) || ""; } catch (e) { /* */ }

  var $ = function (id) { return document.getElementById(id); };
  var flash = $("flash"), loginForm = $("login"), list = $("list"), detail = $("detail"), tabs = $("tabs");

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
    tabs.hidden = true; list.hidden = true; detail.hidden = true; loginForm.hidden = false;
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
  window.addEventListener("hashchange", route);

  function start() {
    if (!state.token) { logout(""); return; }
    loginForm.hidden = true; tabs.hidden = false;
    route();
  }

  function route() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (id) showDetail(id); else showList();
  }

  // ---------------- список ----------------
  function showList() {
    detail.hidden = true; list.hidden = false;
    clear(list);
    list.appendChild(h("p", { class: "muted", text: "Завантаження…" }));
    api("/api/admin/applications?filter=" + encodeURIComponent(state.filter)).then(function (j) {
      clear(list);
      if (!j.ok) { say(j.error || "Помилка", "err"); return; }
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

  start();
})();
