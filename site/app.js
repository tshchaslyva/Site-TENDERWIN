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
     Заявка надсилається через Web3Forms на пошту, для якої створено
     ключ (vitalii@tenderwin.com.ua). Якщо ключ ще не вставлено або
     сервіс недоступний — відкривається поштова програма відвідувача
     з уже заповненим листом, тож заявка не губиться.
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
      "?subject=" + encodeURIComponent("Заявка з сайту tenderwin.com.ua") +
      "&body=" + encodeURIComponent(body);
  }

  var CONTACTS =
    'Зателефонуйте: <a href="' + PHONE_HREF + '">' + PHONE_TEXT + '</a>, ' +
    'напишіть на <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> ' +
    'або в <a href="' + TELEGRAM + '" target="_blank" rel="noopener">Telegram</a>.';

  if (form) {
    // у полі ЄДРПОУ/ІПН лишаємо тільки цифри
    var code = form.elements["Код ЄДРПОУ/ІПН"];
    if (code) {
      code.addEventListener("input", function () {
        var clean = code.value.replace(/\D+/g, "").slice(0, 10);
        if (clean !== code.value) code.value = clean;
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

      var keyField = form.elements["access_key"];
      var key = keyField ? keyField.value.trim() : "";

      // Ключ ще не вставлено: відкриваємо поштову програму з готовим листом
      if (!key || key.indexOf("ВСТАВТЕ") === 0) {
        say("Відкриваємо вашу поштову програму з готовим листом — залишиться лише натиснути «Надіслати». " +
            "Якщо вона не відкрилася: " + CONTACTS, "info");
        window.location.href = mailtoHref();
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var old = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Надсилаємо…"; }
      say("", "");

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
            say("Дякуємо, заявку отримано! Ми зв’яжемося з вами найближчим часом " +
                "і надішлемо рахунок. Якщо строк оскарження спливає — " + CONTACTS, "ok");
          } else {
            say("Не вдалося надіслати заявку. " + CONTACTS +
                ' Або <a href="' + mailtoHref() + '">надішліть її листом</a>.', "err");
          }
        })
        .catch(function () {
          say("Не вдалося надіслати заявку. " + CONTACTS +
              ' Або <a href="' + mailtoHref() + '">надішліть її листом</a>.', "err");
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.textContent = old; }
        });
    });
  }
})();
