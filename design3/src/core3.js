/* TenderWin — спільна поведінка прототипів етапу 1 (v3.0). Без бібліотек.
   Прототипи ізольовані: форма нічого не надсилає, дзвінок не замовляється, статистика не збирається.
   data-r        — другорядний елемент з’являється один раз (300–500 мс); без JS і при збої видно все
   .faq details  — розкриття 220 мс
   form[data-demo] — перевірка полів і демонстрація станів «помилка / надсилання / збережено / лист затримався»
   #mbar         — мобільна панель ховається біля форми
   [data-viewer] — переглядач звіту (viewer.js)                                                        */
(function () {
  "use strict";
  var root = document.documentElement;
  var RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (RM) root.classList.add("rm");
  window.TW = window.TW || {};
  TW.RM = RM;

  /* ---------- поява: лише для елементів нижче першого екрана ---------- */
  try {
    var els = document.querySelectorAll("[data-r]");
    if (!RM && "IntersectionObserver" in window) {
      var vh = window.innerHeight || 800;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
      Array.prototype.forEach.call(els, function (el) {
        if (el.getBoundingClientRect().top > vh) { el.classList.add("pre"); io.observe(el); }
      });
      setTimeout(function () { Array.prototype.forEach.call(els, function (el) { el.classList.add("in"); }); }, 2500);
    }
  } catch (e) { /* зміст лишається видимим */ }

  /* ---------- FAQ ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".faq details"), function (d) {
    var s = d.querySelector("summary"), a = d.querySelector(".ans");
    if (!s || !a) return;
    s.addEventListener("click", function (e) {
      if (RM) return;
      e.preventDefault();
      if (d.open) {
        a.style.height = a.scrollHeight + "px";
        requestAnimationFrame(function () { a.style.height = "0px"; });
        setTimeout(function () { d.open = false; a.style.height = ""; }, 220);
      } else {
        d.open = true;
        a.style.height = "0px";
        requestAnimationFrame(function () { a.style.height = a.scrollHeight + "px"; });
        setTimeout(function () { a.style.height = ""; }, 240);
      }
    });
  });

  /* ---------- форма (демонстрація) ---------- */
  var TENDER_RE = /UA-\d{4}-\d{2}-\d{2}-\d{6}-[a-z]/i;
  function demoId() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    return "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-1";
  }
  Array.prototype.forEach.call(document.querySelectorAll("form[data-demo]"), function (f) {
    var msg = f.querySelector(".msg"), btn = f.querySelector("[type=submit]"), btnText = btn.textContent;
    var noCode = f.querySelector("#f-nocode"), code = f.querySelector("#f-code"), txt = f.querySelector("#f-msg"), cnt = f.querySelector("#f-msg-count");
    if (txt && cnt) txt.addEventListener("input", function () { cnt.textContent = txt.value.length + " / 2000"; });
    if (noCode && code) noCode.addEventListener("change", function () { code.disabled = noCode.checked; if (noCode.checked) setErr(code, ""); });
    function setErr(el, text) {
      var e = f.querySelector("#" + el.id + "-err");
      el.setAttribute("aria-invalid", text ? "true" : "false");
      if (e) e.textContent = text;
    }
    function check() {
      var bad = null, v = function (id) { var el = f.querySelector("#" + id); return el ? el.value.trim() : ""; };
      var rules = [
        ["f-name", v("f-name").length >= 2, "Вкажіть Ваше ім’я."],
        ["f-mail", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("f-mail")), "Вкажіть коректну електронну пошту — на неї надішлемо підтвердження."],
        ["f-tender", TENDER_RE.test(v("f-tender")), "Вкажіть ID у форматі UA-2026-09-30-000123-a або посилання на закупівлю."],
        ["f-org", v("f-org").length >= 2, "Вкажіть назву учасника або ПІБ ФОП."],
        ["f-code", (noCode && noCode.checked) || /^\d{8}$|^\d{10}$/.test(v("f-code").replace(/\s/g, "")), "Код ЄДРПОУ має 8 цифр, РНОКПП — 10. Якщо коду немає, позначте це нижче."],
        ["f-contact", /^@[A-Za-z0-9_]{4,32}$|^\+?[\d\s()-]{10,18}$/.test(v("f-contact")), "Вкажіть телефон (+380 67 123 45 67) або Telegram (@username)."],
        ["f-msg", v("f-msg").length <= 2000, "Скоротіть опис до 2000 символів."]
      ];
      rules.forEach(function (r) {
        var el = f.querySelector("#" + r[0]);
        if (!el) return;
        setErr(el, r[1] ? "" : r[2]);
        if (!r[1] && !bad) bad = el;
      });
      var ok = f.querySelector("#f-ok");
      setErr(ok, ok.checked ? "" : "Потрібна Ваша згода на обробку персональних даних.");
      if (!ok.checked && !bad) bad = ok;
      return bad;
    }
    function state(kind) {
      var email = (f.querySelector("#f-mail") || {}).value || "name@company.ua", id = demoId();
      btn.disabled = kind === "sending"; btn.textContent = kind === "sending" ? "Надсилаємо…" : btnText;
      btn.classList.toggle("loading", kind === "sending");
      var demo = '<small class="demo-tag">Демонстрація прототипу: заявку не надіслано.</small>';
      var map = {
        error: ["err", "Перевірте позначені поля — нижче кожного є підказка."],
        sending: ["info", "Надсилаємо заявку…"],
        saved: ["ok", "Дякуємо! Заявку № " + id + " збережено. Перед оплатою підтвердимо обсяг і строк роботи. Контактна адреса: " + email.replace(/[<>&"]/g, "")],
        delayed: ["warn", "Заявку № " + id + " збережено. Підтвердження електронною поштою затримується. Повторно заповнювати форму не потрібно."],
        "": ["", ""]
      };
      var m = map[kind] || map[""];
      msg.className = "msg " + m[0];
      msg.innerHTML = m[1] ? m[1] + demo : "";
    }
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = check();
      if (bad) { state("error"); bad.focus(); return; }
      state("sending");
      setTimeout(function () { state("saved"); }, RM ? 0 : 900);
    });
    Array.prototype.forEach.call(f.parentNode.querySelectorAll("[data-state]"), function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-state");
        if (k === "error") { check(); }
        else Array.prototype.forEach.call(f.querySelectorAll("[aria-invalid]"), function (el) { setErr(el, ""); });
        state(k);
        msg.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" });
      });
    });
  });

  /* ---------- мобільна панель ---------- */
  var bar = document.getElementById("mbar"), form = document.getElementById("zayavka");
  if (bar && form && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) {
      bar.classList.toggle("away", e.isIntersecting);
      var c = document.getElementById("cb"); if (c) c.classList.toggle("away", e.isIntersecting);   // не перекриваємо форму й згоду
    }); }, { threshold: 0.02 }).observe(form);
  }

  /* ---------- місце віджета Zadarma (у прототипі — лише показ) ---------- */
  var cb = document.getElementById("cb"), cbp = document.getElementById("cb-pop");
  if (cb && cbp) {
    var close = function () { cbp.hidden = true; cb.setAttribute("aria-expanded", "false"); };
    cb.addEventListener("click", function () {
      var open = cbp.hidden;
      cbp.hidden = !open; cb.setAttribute("aria-expanded", String(open));
      if (open) { var t = cbp.querySelector("input,button"); if (t) t.focus(); }
    });
    cbp.addEventListener("keydown", function (e) { if (e.key === "Escape") { close(); cb.focus(); } });
    var cx = cbp.querySelector(".cb-x"); if (cx) cx.addEventListener("click", function () { close(); cb.focus(); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-callback]"), function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); if (cbp.hidden) cb.click(); });
    });
  }

  /* ---------- переглядачі звіту ---------- */
  TW.viewers = {};
  if (window.RV) Array.prototype.forEach.call(document.querySelectorAll("[data-viewer]"), function (el) {
    TW.viewers[el.id || ("v" + Object.keys(TW.viewers).length)] = window.RV.mount(el, {
      doc: el.getAttribute("data-doc") || "pos", mode: el.getAttribute("data-mode") || "page",
      docs: el.getAttribute("data-docs") !== "false", focusControls: el.getAttribute("data-controls") !== "false",
      thumbs: el.getAttribute("data-thumbs") === "true"
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-open-report]"), function (b) {
    b.addEventListener("click", function (e) {
      if (!window.RV) return;
      e.preventDefault();
      var v = TW.viewers[b.getAttribute("data-open-report")];
      if (v) v.open(); else window.RV.open("pos", 1, null);
    });
  });
})();
