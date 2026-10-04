/* TenderWin «Розвиток» — поведінка прототипу на основі чинного сайту. Без бібліотек.
   Прототип ізольований: форма нічого не надсилає, дзвінок не замовляється, статистика не збирається.
   Рух: одноразова поява під час прокрутки (без перехоплення прокрутки, без руху за курсором, без автогортання).
   «Менше руху» в системі — усе видно одразу, без анімацій.                                              */
(function () {
  "use strict";
  var root = document.documentElement;
  var RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (RM) root.classList.add("rm");
  var IO = "IntersectionObserver" in window;
  function each(sel, fn) { Array.prototype.forEach.call(typeof sel === "string" ? document.querySelectorAll(sel) : sel, fn); }

  /* ---------- шапка: тінь, прогрес, активний розділ ---------- */
  var header = document.getElementById("header"), tick = false;
  function onScroll() {
    if (tick) return; tick = true;
    requestAnimationFrame(function () {
      if (header) header.classList.toggle("scrolled", window.scrollY > 8);
      var h = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--sp", h > 0 ? (window.scrollY / h).toFixed(4) : 0);
      tick = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  if (IO) {
    var links = {};
    each(".nav-links a", function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = links[e.target.id]; if (!a || !e.isIntersecting) return;
        each(".nav-links a", function (x) { x.classList.toggle("is-active", x === a); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- черговість дрібних елементів ---------- */
  each(".result-list", function (ul) { each(ul.children, function (li, i) { li.style.setProperty("--i", i); }); });
  each(".legend .it", function (b, i) { b.style.setProperty("--i", i); });
  each(".contact-card .contact-line", function (c, i) { c.style.setProperty("--i", i); });

  /* ---------- поява під час прокрутки (без неї весь зміст теж видно) ---------- */
  try {
    var items = document.querySelectorAll("[data-reveal], .legend, .viewer-card, .steps, .contact-card");
    if (!RM && IO && items.length) {
      root.classList.add("js");
      var vh = window.innerHeight || 800;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      each(items, function (el, i) {
        if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add("in");
        else { if (el.hasAttribute("data-reveal")) el.style.transitionDelay = (i % 3) * 70 + "ms"; io.observe(el); }
      });
      setTimeout(function () { each(items, function (el) { el.classList.add("in"); }); }, 3500);   // запобіжник
    }
  } catch (e) { root.classList.remove("js"); }

  /* ---------- питання: плавне розкриття ---------- */
  each(".faq details", function (d) {
    var s = d.querySelector("summary"), a = d.querySelector(".answer");
    if (!s || !a) return;
    s.addEventListener("click", function (e) {
      if (RM) return;
      e.preventDefault();
      a.classList.add("anim");
      if (d.open) {
        a.style.height = a.scrollHeight + "px";
        requestAnimationFrame(function () { requestAnimationFrame(function () { a.style.height = "0px"; }); });
        setTimeout(function () { d.open = false; a.style.height = ""; a.classList.remove("anim"); }, 270);
      } else {
        d.open = true;
        a.style.height = "0px";
        requestAnimationFrame(function () { requestAnimationFrame(function () { a.style.height = a.scrollHeight + "px"; }); });
        setTimeout(function () { a.style.height = ""; a.classList.remove("anim"); }, 290);
      }
    });
  });

  /* ---------- приклад звіту: переглядач і пояснення ---------- */
  var sample = null, sel = document.getElementById("sample");
  if (window.RV && sel) {
    sample = window.RV.mount(sel, { doc: sel.getAttribute("data-doc"), mode: "page", docs: true, thumbs: true });
    var its = document.querySelectorAll(".legend .it");
    each(its, function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-key"), on = b.getAttribute("aria-pressed") !== "true";
        each(its, function (x) { x.setAttribute("aria-pressed", String(x === b && on)); });
        sample.highlight(on ? k : null);
      });
    });
    sel.addEventListener("rv:change", function (e) {
      if (!e.detail.key) each(its, function (x) { x.setAttribute("aria-pressed", "false"); });
      var d = sample.doc(), f = document.getElementById("facts");
      if (f) {
        var bs = f.querySelectorAll("b[data-n]");
        if (bs[0] && bs[0].getAttribute("data-n") !== String(d.pageCount)) { bs[0].setAttribute("data-n", d.pageCount); bs[0].textContent = d.pageCount; }
        if (bs[1] && bs[1].getAttribute("data-n") !== String(d.toc.length)) { bs[1].setAttribute("data-n", d.toc.length); bs[1].textContent = d.toc.length; }
      }
    });
  }
  /* цифри прикладу: підрахунок при появі */
  function countUp(el) {
    var n = Number(el.getAttribute("data-n")); if (!n || RM) return;
    var t0 = performance.now(), dur = 900;
    (function f(t) { var k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); else el.textContent = el.getAttribute("data-n"); })(t0);
  }
  var facts = document.getElementById("facts");
  if (facts && IO && !RM) {
    var fo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { each(e.target.querySelectorAll("[data-n]"), countUp); fo.disconnect(); } });
    }, { threshold: 0.6 });
    fo.observe(facts);
  }

  /* ---------- форма заявки (демонстрація) ---------- */
  var form = document.getElementById("leadform"), msg = document.getElementById("formmsg");
  if (form && msg) {
    var btn = form.querySelector('button[type="submit"]'), btnText = btn.textContent;
    var TENDER_RE = /UA-\d{4}-\d{2}-\d{2}-\d{6}-[a-z]/i;
    var noCode = document.getElementById("f-nocode"), code = document.getElementById("f-code");
    if (noCode && code) noCode.addEventListener("change", function () { code.disabled = noCode.checked; if (noCode.checked) setErr(code, ""); });
    var demoId = function () {
      var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
      return "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-1";
    };
    function setErr(el, text) {
      var e = document.getElementById(el.id + "-err");
      el.setAttribute("aria-invalid", text ? "true" : "false");
      if (e) e.textContent = text;
    }
    function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
    function check() {
      var bad = null;
      [
        ["f-name", v("f-name").length >= 2, "Вкажіть Ваше ім’я."],
        ["f-mail", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("f-mail")), "Вкажіть коректну електронну пошту — на неї надішлемо підтвердження."],
        ["f-tender", TENDER_RE.test(v("f-tender")), "Вкажіть ID закупівлі у форматі UA-2026-09-30-000123-a або вставте посилання на закупівлю."],
        ["f-org", v("f-org").length >= 2, "Вкажіть назву учасника або ПІБ ФОП."],
        ["f-code", (noCode && noCode.checked) || /^\d{8}$|^\d{10}$/.test(v("f-code").replace(/\s/g, "")), "Код ЄДРПОУ має 8 цифр, РНОКПП — 10 цифр. Якщо коду немає, позначте «Коду немає — уточню окремо»."],
        ["f-contact", !v("f-contact") || /^@[A-Za-z0-9_]{4,32}$|^\+?[\d\s()-]{10,18}$/.test(v("f-contact")), "Вкажіть телефон (наприклад, +380 67 123 45 67) або Telegram (@username)."],
        ["f-msg", v("f-msg").length <= 2000, "Скоротіть опис до 2000 символів."],
        ["f-consent", document.getElementById("f-consent").checked, "Потрібна Ваша згода на обробку персональних даних."]
      ].forEach(function (r) {
        var el = document.getElementById(r[0]); if (!el) return;
        setErr(el, r[1] ? "" : r[2]);
        if (!r[1] && !bad) bad = el;
      });
      return bad;
    }
    function state(kind) {
      var email = v("f-mail") || "name@company.ua", id = demoId();
      btn.disabled = kind === "sending"; btn.textContent = kind === "sending" ? "Надсилаємо…" : btnText;
      btn.classList.toggle("loading", kind === "sending");
      var demo = '<small class="demo-tag">Демонстрація прототипу: заявку не надіслано.</small>';
      var map = {
        error: ["err", "Перевірте позначені поля — під кожним є підказка."],
        sending: ["info", "Надсилаємо заявку…"],
        saved: ["ok", "Дякуємо! Заявку № " + id + " збережено. Перед оплатою підтвердимо обсяг і строк роботи. Контактна адреса: " + email.replace(/[<>&"]/g, "") + "."],
        delayed: ["warn", "Заявку № " + id + " збережено. Підтвердження електронною поштою затримується. Повторно заповнювати форму не потрібно."],
        "": ["", ""]
      };
      var m = map[kind] || map[""];
      msg.className = "formmsg " + m[0];
      msg.innerHTML = m[1] ? m[1] + demo : "";
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = check();
      if (bad) { state("error"); bad.focus(); return; }
      state("sending");
      setTimeout(function () { state("saved"); }, RM ? 0 : 900);
    });
    each(form.querySelectorAll("[data-state]"), function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-state");
        if (k === "error") check();
        else each(form.querySelectorAll("[aria-invalid]"), function (el) { setErr(el, ""); });
        state(k);
        msg.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" });
      });
    });
  }

  /* ---------- мобільна панель і кнопка дзвінка ховаються біля форми ---------- */
  var bar = document.getElementById("mobilebar"), formSec = document.getElementById("zayavka"), cb = document.getElementById("cb");
  if (formSec && IO) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (bar) bar.classList.toggle("away", e.isIntersecting);
        if (cb) cb.classList.toggle("away", e.isIntersecting);
      });
    }, { threshold: 0.01 }).observe(formSec);
  }

  /* ---------- місце віджета Zadarma (у прототипі — лише показ) ---------- */
  var cbp = document.getElementById("cb-pop");
  if (cb && cbp) {
    var opener = cb;
    var openPop = function (from) {
      opener = from || cb;
      cbp.hidden = false; cb.setAttribute("aria-expanded", "true");
      var t = cbp.querySelector("input:not([disabled]),button:not([disabled])"); if (t) t.focus();
    };
    var close = function () { cbp.hidden = true; cb.setAttribute("aria-expanded", "false"); try { opener.focus(); } catch (e) { /* */ } };
    cb.addEventListener("click", function () { if (cbp.hidden) openPop(cb); else close(); });
    cbp.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    var cx = cbp.querySelector(".cb-x"); if (cx) cx.addEventListener("click", close);
    each("[data-callback]", function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); if (cbp.hidden) openPop(a); });
    });
  }
})();
