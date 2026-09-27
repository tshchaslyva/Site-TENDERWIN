/* ================================================================
   TenderWin — поведінка сторінки.
   Тексти сайту редагуються в index.html; цей файл змінювати не потрібно.
   ================================================================ */
(function () {
  "use strict";

  var EMAIL = "vitalii@tenderwin.com.ua";
  var PHONE_TEXT = "+380 50 310 14 92";
  var PHONE_HREF = "tel:+380503101492";
  var TELEGRAM = "https://t.me/+380503101492";

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

  /* ---------- плавна поява блоків ---------- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll("[data-reveal]");
  if (!reduce && "IntersectionObserver" in window && items.length) {
    root.classList.add("js");
    var vh = window.innerHeight || 800;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(items, function (el, i) {
      // те, що вже видно на екрані, показуємо одразу — без мерехтіння
      if (el.getBoundingClientRect().top < vh) {
        el.classList.add("in");
      } else {
        el.style.transitionDelay = (i % 3) * 70 + "ms";
        io.observe(el);
      }
    });
  }

  /* ================================================================
     ФОРМА ЗАЯВКИ
     1) Основний канал — наш обробник /api/zayavka (Cloudflare Worker):
        лист Віталію + лист клієнту з PDF-рахунком.
     2) Якщо він недоступний — запасний канал Web3Forms (лист Віталію),
        а без ключа Web3Forms — поштова програма відвідувача з готовим листом.
     ================================================================ */
  var form = document.getElementById("leadform");
  var msg = document.getElementById("formmsg");

  function say(html, kind) {
    if (!msg) return;
    msg.innerHTML = html;
    msg.className = "formmsg" + (kind ? " " + kind : "");
  }

  function val(name) {
    var el = form.elements[name];
    return el && el.value ? String(el.value).trim() : "";
  }

  function mailtoHref() {
    var body = [
      "Ім’я: " + val("Ім’я"),
      "Телефон: " + val("Телефон"),
      "E-mail: " + val("email"),
      "ID закупівлі: " + val("ID закупівлі"),
      "Код ЄДРПОУ/ІПН: " + val("Код ЄДРПОУ/ІПН"),
      "",
      "Ситуація: " + val("Ситуація")
    ].join("\n");
    return "mailto:" + EMAIL +
      "?subject=" + encodeURIComponent("Заявка з сайту tenderwin.in.ua") +
      "&body=" + encodeURIComponent(body);
  }

  var CONTACTS =
    'Зателефонуйте: <a href="' + PHONE_HREF + '">' + PHONE_TEXT + '</a>, ' +
    'напишіть на <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> ' +
    'або в <a href="' + TELEGRAM + '" target="_blank" rel="noopener">Telegram</a>.';

  // ---------- перевірка кодів (ті самі правила, що на сервері) ----------
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
  function extractTender(t) {
    var m = String(t || "").match(/UA-\d{4}-\d{2}-\d{2}-\d{6}(?:-[a-zA-Z])?/i);
    return m ? m[0].toUpperCase().replace(/-([A-Z])$/, function (x, ch) { return "-" + ch.toLowerCase(); }) : "";
  }

  // ---------- запасний канал: Web3Forms (або поштова програма) ----------
  function sendViaWeb3Forms(done) {
    var keyField = form.elements["access_key"];
    var key = keyField ? keyField.value.trim() : "";
    if (!key || key.indexOf("ВСТАВТЕ") === 0) {
      say("Відкриваємо вашу поштову програму з готовим листом — залишиться лише натиснути «Надіслати». " +
          "Якщо вона не відкрилася: " + CONTACTS, "info");
      window.location.href = mailtoHref();
      done();
      return;
    }
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === "checkbox") {
        if (el.name === "botcheck") { data.botcheck = el.checked; return; }
        if (el.checked) data[el.name] = el.value || "Так";
        return;
      }
      data[el.name] = el.value;
    });
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.success) {
          form.reset();
          say("Дякуємо, заявку отримано! Найближчим часом надішлемо вам рахунок на пошту. " +
              "Якщо строк оскарження спливає — " + CONTACTS, "ok");
        } else {
          say("Не вдалося надіслати заявку. " + CONTACTS +
              ' Або <a href="' + mailtoHref() + '">надішліть її листом</a>.', "err");
        }
      })
      .catch(function () {
        say("Не вдалося надіслати заявку. " + CONTACTS +
            ' Або <a href="' + mailtoHref() + '">надішліть її листом</a>.', "err");
      })
      .then(done);
  }

  function escHtml(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  if (form) {
    var loadedAt = Date.now();
    var code = form.elements["Код ЄДРПОУ/ІПН"];
    var tender = form.elements["ID закупівлі"];

    // у полі ЄДРПОУ/ІПН лишаємо тільки цифри і перевіряємо контрольну цифру
    if (code) {
      code.addEventListener("input", function () {
        var c = code.value.replace(/\D+/g, "").slice(0, 10);
        if (c !== code.value) code.value = c;
        code.setCustomValidity("");
      });
      code.addEventListener("change", function () {
        var c = code.value;
        if (c.length === 8 && !validEdrpou(c)) code.setCustomValidity("Схоже, у коді ЄДРПОУ помилка — перевірте цифри.");
        else if (c.length === 10 && !validRnokpp(c)) code.setCustomValidity("Схоже, в ІПН помилка — перевірте цифри.");
        else if (c && c.length !== 8 && c.length !== 10) code.setCustomValidity("Код ЄДРПОУ має 8 цифр, ІПН — 10 цифр.");
        else code.setCustomValidity("");
      });
    }

    // із вставленого посилання лишаємо лише ID закупівлі
    if (tender) {
      tender.addEventListener("input", function () { tender.setCustomValidity(""); });
      tender.addEventListener("change", function () {
        var id = extractTender(tender.value);
        if (id) { tender.value = id; tender.setCustomValidity(""); }
        else if (tender.value.trim()) tender.setCustomValidity("Вкажіть ID у форматі UA-2026-01-01-000000-a або вставте посилання на закупівлю.");
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (code) code.dispatchEvent(new Event("change"));
      if (tender) tender.dispatchEvent(new Event("change"));
      if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

      var btn = form.querySelector('button[type="submit"]');
      var old = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Надсилаємо…"; }
      say("", "");
      function done() { if (btn) { btn.disabled = false; btn.textContent = old; } }

      var consent = form.elements["Згода на обробку персональних даних"];
      var bot = form.elements["botcheck"];
      var payload = {
        name: val("Ім’я"),
        phone: val("Телефон"),
        email: val("email"),
        tender: val("ID закупівлі"),
        code: val("Код ЄДРПОУ/ІПН"),
        message: val("Ситуація"),
        consent: !!(consent && consent.checked),
        botcheck: !!(bot && bot.checked),
        elapsed: Date.now() - loadedAt
      };

      fetch("/api/zayavka", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (res) { return { status: r.status, res: res }; });
        })
        .then(function (x) {
          var res = x.res || {};
          if (x.status === 200 && res.ok) {
            var mail = escHtml(res.email || payload.email);
            form.reset();
            loadedAt = Date.now();
            if (res.invoice && res.emailed) {
              say("Дякуємо, заявку отримано! Рахунок № " + escHtml(res.invoice) + " надіслано на " + mail +
                  ". Якщо листа немає кілька хвилин — перевірте папку «Спам».", "ok");
            } else if (res.emailed) {
              say("Дякуємо, заявку отримано! Підтвердження надіслано на " + mail +
                  ", рахунок надішлемо найближчим часом.", "ok");
            } else {
              say("Дякуємо, заявку отримано! Ми зв’яжемося з вами найближчим часом і надішлемо рахунок.", "ok");
            }
            done();
            return;
          }
          if (x.status === 400 && res.error) {
            say(escHtml(res.error), "err");
            done();
            return;
          }
          if (x.status === 429) {
            say(escHtml(res.error || "Забагато заявок.") + " " + CONTACTS, "err");
            done();
            return;
          }
          // сервіс тимчасово недоступний — надсилаємо запасним каналом
          sendViaWeb3Forms(done);
        })
        .catch(function () { sendViaWeb3Forms(done); });
    });
  }
})();
