/* TenderWin — спільна поведінка концепцій (без бібліотек).
   data-r            — поява під час прокрутки (клас .in), data-d="120" — затримка в мс
   data-split        — розбити текст на слова (span.w з --i) для покрокової анімації
   data-count="3499" — лічильник до числа, коли елемент у кадрі
   data-magnet       — кнопка злегка тягнеться до курсора
   details у .faq    — плавне відкриття
   form[data-demo]   — демонстраційна заявка (нічого не надсилає)
   #mbar             — мобільна панель ховається біля форми
   --sp на <html>    — прогрес прокрутки сторінки 0…1                           */
(function () {
  "use strict";
  var root = document.documentElement;
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (RM) root.classList.add("rm");
  root.classList.add("js");
  window.TW = window.TW || {};
  TW.RM = RM;

  /* ---------- розбиття тексту на слова ---------- */
  function split(el) {
    if (el.dataset.splitDone) return;
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/([ \t\n\r\f]+)/); // нерозривний пробіл не розбиваємо
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^[ \t\n\r\f]+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement("span");
            s.className = "w";
            s.style.setProperty("--i", i++);
            var inner = document.createElement("span");
            inner.textContent = p;
            s.appendChild(inner);
            frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains("w")) {
          if (n.classList.contains("nw")) {
            var inner = document.createElement("span");
            while (n.firstChild) inner.appendChild(n.firstChild);
            n.appendChild(inner);
            n.classList.add("w"); n.style.setProperty("--i", i++); return;
          }
          walk(n);
        }
      });
    })(el);
    el.dataset.splitDone = "1";
    el.style.setProperty("--n", i);
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-split]"), split);
  TW.split = split;

  /* ---------- поява під час прокрутки ---------- */
  var revealEls = document.querySelectorAll("[data-r]");
  function show(el) {
    var d = Number(el.getAttribute("data-d") || 0);
    if (d && !RM) setTimeout(function () { el.classList.add("in"); }, d); else el.classList.add("in");
    el.dispatchEvent(new CustomEvent("tw:in"));
  }
  if ("IntersectionObserver" in window && !RM) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
    setTimeout(function () { Array.prototype.forEach.call(revealEls, function (el) { if (!el.classList.contains("in")) show(el); }); }, 9000);
  } else {
    Array.prototype.forEach.call(revealEls, show);
  }
  TW.onIn = function (el, fn) {
    if (!el) return;
    if (el.classList.contains("in")) fn(); else el.addEventListener("tw:in", fn, { once: true });
  };
  TW.whenVisible = function (el, fn, threshold) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { fn(); return; }
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { fn(); o.disconnect(); } });
    }, { threshold: threshold || 0.3 });
    o.observe(el);
  };

  /* ---------- лічильники ---------- */
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  Array.prototype.forEach.call(document.querySelectorAll("[data-count]"), function (el) {
    var target = Number(el.getAttribute("data-count"));
    var dur = Number(el.getAttribute("data-dur") || 1400);
    if (RM) { el.textContent = fmt(target); return; }
    el.textContent = fmt(0);
    TW.whenVisible(el, function () {
      var t0 = performance.now();
      (function tick(t) {
        var k = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt(Math.round(target * e));
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }, 0.6);
  });

  /* ---------- прогрес прокрутки ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var h = root.scrollHeight - innerHeight;
      root.style.setProperty("--sp", h > 0 ? (scrollY / h).toFixed(4) : 0);
      Array.prototype.forEach.call(document.querySelectorAll("[data-progress]"), function (el) {
        var r = el.getBoundingClientRect();
        var p = (innerHeight - r.top) / (r.height + innerHeight);
        el.style.setProperty("--p", Math.max(0, Math.min(1, p)).toFixed(4));
      });
      var hdr = document.querySelector("[data-header]");
      if (hdr) hdr.classList.toggle("scrolled", scrollY > 10);
      ticking = false;
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  /* ---------- магнітні кнопки ---------- */
  if (!RM && window.matchMedia("(pointer:fine)").matches) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-magnet]"), function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.transform = "translate(" + (x * 10).toFixed(1) + "px," + (y * 8).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* ---------- плавний FAQ ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".faq details"), function (d) {
    var s = d.querySelector("summary"), a = d.querySelector(".ans");
    if (!s || !a) return;
    s.addEventListener("click", function (e) {
      if (RM) return;
      e.preventDefault();
      if (d.open) {
        a.style.height = a.scrollHeight + "px";
        requestAnimationFrame(function () { a.style.height = "0px"; a.style.opacity = "0"; });
        setTimeout(function () { d.open = false; a.style.height = ""; a.style.opacity = ""; }, 320);
      } else {
        d.open = true;
        a.style.height = "0px"; a.style.opacity = "0";
        requestAnimationFrame(function () { a.style.height = a.scrollHeight + "px"; a.style.opacity = "1"; });
        setTimeout(function () { a.style.height = ""; }, 340);
      }
    });
  });

  /* ---------- демонстраційна форма ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("form[data-demo]"), function (f) {
    var msg = f.querySelector(".msg");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = null;
      Array.prototype.forEach.call(f.querySelectorAll("[required]"), function (i) {
        var ok = i.type === "checkbox" ? i.checked : i.value.trim().length > 1;
        var err = f.querySelector("#" + i.id + "-err");
        i.setAttribute("aria-invalid", ok ? "false" : "true");
        if (err) err.textContent = ok ? "" : (i.type === "checkbox" ? "Потрібна Ваша згода." : "Заповніть це поле.");
        if (!ok && !bad) bad = i;
      });
      if (bad) { bad.focus(); msg.className = "msg err"; msg.textContent = "Перевірте позначені поля."; return; }
      var btn = f.querySelector("[type=submit]");
      btn.classList.add("loading");
      setTimeout(function () {
        btn.classList.remove("loading");
        msg.className = "msg ok";
        msg.innerHTML = "Дякуємо! Заявку № 20261003-1 збережено. Перед оплатою підтвердимо обсяг і строк роботи." +
          "<small>Це демонстрація макета: заявку не надіслано.</small>";
      }, RM ? 0 : 900);
    });
  });

  /* ---------- мобільна панель ---------- */
  var bar = document.getElementById("mbar"), form = document.getElementById("zayavka");
  if (bar && form && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { bar.classList.toggle("away", e.isIntersecting); }); }, { threshold: 0.05 }).observe(form);
  }

  /* ---------- допоміжне для кейсів ---------- */
  TW.cases = (window.TW_DATA && window.TW_DATA.cases) || [];
  TW.disclaimer = (window.TW_DATA && window.TW_DATA.disclaimer) || "";
  TW.esc = function (t) {
    return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  TW.rows = function (c) {
    return [
      { k: "Що зазначив замовник", v: c.decision, r: "Рішення про відхилення" },
      { k: "Вимога документації", v: c.requirement.text, r: c.requirement.ref },
      { k: "Що є в пропозиції", v: c.proposal.text, r: c.proposal.ref },
      { k: "Оцінка", v: c.assessment, r: "" },
      { k: "Ризики", v: c.risks, r: "" },
      { k: "Наступні кроки", v: c.next, r: "" }
    ];
  };
  TW.level = function (c) { return c.strength === "strong" ? 3 : c.strength === "medium" ? 2 : 1; };
})();
