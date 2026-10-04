/* TenderWin — переглядач справжнього звіту (спільний для трьох концепцій).
   Дані — window.TW_REPORTS (готує design3/report/prepare.py): сторінки-зображення, фрагменти, зміст.
   Підсвічування — окремий шар поверх зображення; PDF не змінюється. Сторінки самі не гортаються.

   RV.mount(el, { doc, mode: "page" | "focus", docs: true, aspect }) → контролер:
     .show(docId)       — інший документ        .page(n)       — сторінка (режим page)
     .highlight(key)    — фрагмент або null      .open(page, key) — читання на весь екран
   Подія "rv:change" на el: { doc, page, key }                                           */
(function () {
  "use strict";
  var DATA = window.TW_REPORTS || { documents: [], explain: {} };
  var RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var byId = {};
  DATA.documents.forEach(function (d) { byId[d.id] = d; });

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  }
  function pagesWord(n) { return n % 10 === 1 && n % 100 !== 11 ? "сторінка" : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? "сторінки" : "сторінок"; }
  function kindLine(d) {
    return d.pageCount + " " + pagesWord(d.pageCount) + " · PDF " + d.pdfKb + " КБ";
  }
  function pdfName(d) { return d.pdf.split("/").pop(); }
  var ICON = {
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>',
    dl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>'
  };

  /* ================= вбудований переглядач ================= */
  function mount(root, opts) {
    opts = opts || {};
    var st = { doc: byId[opts.doc] ? opts.doc : (DATA.documents[0] || {}).id, page: 1, key: null, mode: opts.mode || "page" };
    root.classList.add("rv", "rv-" + st.mode);
    root.innerHTML = "";

    var tabs = null;
    if (opts.docs !== false && DATA.documents.length > 1) {
      tabs = h("div", { class: "rv-docs", role: "tablist", "aria-label": "Приклади звіту" });
      DATA.documents.forEach(function (d, i) {
        var b = h("button", { type: "button", role: "tab", class: "rv-doc", "data-doc": d.id, onclick: function () { ctl.show(d.id); } },
          [h("b", { text: "Приклад " + (i + 1) }), h("span", { text: d.short })]);
        b.addEventListener("keydown", function (e) {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          var n = (i + (e.key === "ArrowRight" ? 1 : DATA.documents.length - 1)) % DATA.documents.length;
          ctl.show(DATA.documents[n].id); tabs.children[n].focus();
        });
        tabs.appendChild(b);
      });
      root.appendChild(tabs);
    }
    var kind = h("p", { class: "rv-kind" });
    root.appendChild(kind);

    var frame = h("div", { class: "rv-frame" });
    var canvas = h("div", { class: "rv-canvas" });
    var img = h("img", { class: "rv-img", alt: "", decoding: "async" });
    var layer = h("div", { class: "rv-layer", "aria-hidden": "true" });
    canvas.appendChild(img); canvas.appendChild(layer); frame.appendChild(canvas);
    var openBtn = h("button", { type: "button", class: "rv-zoomhint", html: ICON.full + "<span>Читати на весь екран</span>", onclick: function () { ctl.open(st.page, st.key); } });
    frame.appendChild(openBtn);
    root.appendChild(frame);
    var desc = h("p", { class: "rv-desc sr" });
    root.appendChild(desc);

    var pn = h("span", { class: "rv-pn", "aria-live": "polite" });
    var prev = h("button", { type: "button", class: "rv-ic", "aria-label": "Попередня сторінка", html: ICON.prev, onclick: function () { ctl.page(st.page - 1); } });
    var next = h("button", { type: "button", class: "rv-ic", "aria-label": "Наступна сторінка", html: ICON.next, onclick: function () { ctl.page(st.page + 1); } });
    var full = h("button", { type: "button", class: "rv-btn", html: ICON.full + "<span>На весь екран</span>", onclick: function () { ctl.open(st.page, st.key); } });
    var pdf = h("a", { class: "rv-btn", target: "_blank", rel: "noopener", "data-stat": "pdf", html: ICON.pdf + "<span>Відкрити PDF</span>" });
    var dl = h("a", { class: "rv-btn rv-dl", "data-stat": "pdf", html: ICON.dl + "<span>Завантажити</span>" });
    var ctrl = h("div", { class: "rv-ctrl" }, [h("div", { class: "rv-nav" }, [prev, pn, next]), h("div", { class: "rv-act" }, [full, pdf, dl])]);
    root.appendChild(ctrl);

    function doc() { return byId[st.doc]; }
    function hlFor(key) { return key ? doc().highlights.filter(function (x) { return x.key === key; })[0] : null; }

    function paintLayer(rects) {
      layer.innerHTML = "";
      rects.forEach(function (r) {
        layer.appendChild(h("i", { class: "rv-hl rv-hl-" + (r.key || "focus"), style: "left:" + r.x + "%;top:" + r.y + "%;width:" + r.w + "%;height:" + r.h + "%" }));
      });
    }

    /* у режимі focus показуємо фрагмент крупно: масштаб і зсув полотна */
    function fit() {
      var d = doc(), p = d.pages[st.page - 1];
      if (st.mode !== "focus") { canvas.style.width = ""; canvas.style.transform = ""; return; }
      var r = hlFor(st.key) || d.focus;
      var cw = frame.clientWidth, ch = frame.clientHeight;
      if (!cw || !ch) return;
      var pad = 0.96;
      var pw = Math.min(cw * pad / (r.w / 100), ch * pad / (r.h / 100 * p.ratio));
      pw = Math.max(cw, Math.min(pw, cw * 3.2));
      var ph = pw * p.ratio;
      var cx = (r.x + r.w / 2) / 100 * pw, cy = (r.y + r.h / 2) / 100 * ph;
      var tx = Math.min(0, Math.max(cw - pw, cw / 2 - cx)), ty = Math.min(0, Math.max(ch - ph, ch / 2 - cy));
      canvas.style.width = pw + "px";
      canvas.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px)";
      var want = pw * (window.devicePixelRatio || 1) > 1100 ? p.src2x : p.src;
      if (img.getAttribute("src") !== want) img.src = want;
    }

    function render(emit) {
      var d = doc(), p = d.pages[st.page - 1];
      if (tabs) Array.prototype.forEach.call(tabs.children, function (b) {
        var on = b.getAttribute("data-doc") === st.doc;
        b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
      });
      kind.innerHTML = "";
      if (d.placeholder) kind.appendChild(h("span", { class: "rv-badge", text: "Заглушка" }));
      kind.appendChild(h("span", { text: (d.placeholder ? "Тут буде справжній знеособлений звіт · " : d.kind + " · ") + kindLine(d) }));
      if (st.mode === "page") {
        var want = (frame.clientWidth || 600) * (window.devicePixelRatio || 1) > 1100 ? p.src2x : p.src;
        if (img.getAttribute("src") !== want) img.src = want;
        canvas.style.aspectRatio = "1 / " + p.ratio;
      }
      img.alt = d.title + ". Сторінка " + st.page + " з " + d.pageCount + ". Текст сторінки — нижче, для читачів екрана.";
      desc.textContent = "Текст сторінки " + st.page + ": " + p.text;
      var hl = hlFor(st.key);
      var rects = hl && hl.page === st.page ? [hl] : (st.mode === "focus" && !hl ? [] : []);
      paintLayer(rects);
      root.setAttribute("data-key", st.key || "");
      pn.textContent = "Сторінка " + st.page + " з " + d.pageCount;
      prev.disabled = st.page <= 1; next.disabled = st.page >= d.pageCount;
      pdf.href = d.pdf; dl.href = d.pdf; dl.setAttribute("download", pdfName(d));
      ctrl.hidden = st.mode === "focus" && opts.focusControls === false;
      fit();
      if (emit !== false) root.dispatchEvent(new CustomEvent("rv:change", { detail: { doc: st.doc, page: st.page, key: st.key } }));
    }

    var ctl = {
      el: root,
      state: st,
      show: function (id) { if (!byId[id]) return; st.doc = id; st.page = 1; var k = st.key; st.key = null; if (k) { var x = hlFor(k); if (x) { st.key = k; st.page = x.page; } } render(); },
      page: function (n) { var d = doc(); st.page = Math.max(1, Math.min(d.pageCount, n)); if (st.key && hlFor(st.key).page !== st.page) st.key = null; render(); },
      highlight: function (key) {
        var x = hlFor(key);
        st.key = x ? key : null;
        if (x) st.page = x.page;
        render();
      },
      /** позначити довільну ділянку (розділ змісту): перейти на сторінку й обвести */
      mark: function (r) {
        st.key = null; st.page = r.page; render();
        paintLayer([{ key: "toc", x: r.x, y: r.y, w: r.w, h: r.h }]);
        if (st.mode === "page") {
          var top = frame.getBoundingClientRect().top + canvas.offsetHeight * r.y / 100;
          if (top < 70 || top > innerHeight - 120) window.scrollTo({ top: scrollY + top - innerHeight * 0.3, behavior: RM ? "auto" : "smooth" });
        }
      },
      open: function (page, key) { Modal.open(st.doc, page || st.page, key === undefined ? st.key : key, document.activeElement); },
      doc: doc,
      refit: fit
    };
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { render(false); }, 120); });
    if (!RM) frame.classList.add("rv-anim");
    render(false);
    return ctl;
  }

  /* ================= читання на весь екран (одне вікно на сторінку) ================= */
  var Modal = (function () {
    var dlg, body, title, kindEl, pnEl, zoomEl, tocEl, pdfA, dlA, opener, cur = { doc: null, zoom: 1, key: null };
    var ZOOMS = [1, 1.25, 1.5, 2];
    function build() {
      dlg = h("dialog", { class: "rv-modal", "aria-labelledby": "rv-m-title" });
      title = h("h2", { id: "rv-m-title", class: "rv-m-title" });
      kindEl = h("p", { class: "rv-m-kind" });
      pnEl = h("span", { class: "rv-pn", "aria-live": "polite" });
      zoomEl = h("span", { class: "rv-zoom", "aria-live": "polite" });
      pdfA = h("a", { class: "rv-btn", target: "_blank", rel: "noopener", "data-stat": "pdf", html: ICON.pdf + "<span>PDF</span>" });
      dlA = h("a", { class: "rv-btn", "data-stat": "pdf", html: ICON.dl + "<span>Завантажити</span>" });
      var close = h("button", { type: "button", class: "rv-ic rv-close", "aria-label": "Закрити (Esc)", html: ICON.x, onclick: function () { dlg.close(); } });
      var zMinus = h("button", { type: "button", class: "rv-ic", "aria-label": "Зменшити", html: ICON.minus, onclick: function () { zoom(-1); } });
      var zPlus = h("button", { type: "button", class: "rv-ic", "aria-label": "Збільшити", html: ICON.plus, onclick: function () { zoom(1); } });
      var pPrev = h("button", { type: "button", class: "rv-ic", "aria-label": "Попередня сторінка", html: ICON.prev, onclick: function () { go(curPage() - 1); } });
      var pNext = h("button", { type: "button", class: "rv-ic", "aria-label": "Наступна сторінка", html: ICON.next, onclick: function () { go(curPage() + 1); } });
      tocEl = h("nav", { class: "rv-toc", "aria-label": "Зміст документа" });
      body = h("div", { class: "rv-m-body", tabindex: "0", "aria-label": "Сторінки документа" });
      dlg.appendChild(h("div", { class: "rv-m-head" }, [h("div", { class: "rv-m-t" }, [title, kindEl]), close]));
      dlg.appendChild(h("div", { class: "rv-m-tools" }, [h("div", { class: "rv-nav" }, [pPrev, pnEl, pNext]), h("div", { class: "rv-nav" }, [zMinus, zoomEl, zPlus]), h("div", { class: "rv-act" }, [pdfA, dlA])]));
      dlg.appendChild(h("div", { class: "rv-m-main" }, [tocEl, body]));
      document.body.appendChild(dlg);
      dlg.addEventListener("close", function () { document.documentElement.classList.remove("rv-lock"); if (opener && opener.focus) opener.focus(); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener("keydown", function (e) {
        if (e.target.tagName === "INPUT") return;
        if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(curPage() + 1); }
        if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(curPage() - 1); }
        if (e.key === "+" || e.key === "=") { e.preventDefault(); zoom(1); }
        if (e.key === "-") { e.preventDefault(); zoom(-1); }
      });
      body.addEventListener("scroll", function () { pnEl.textContent = "Сторінка " + curPage() + " з " + byId[cur.doc].pageCount; }, { passive: true });
    }
    function curPage() {
      var ps = body.querySelectorAll(".rv-m-page"), top = body.scrollTop + body.clientHeight * 0.35, n = 1;
      Array.prototype.forEach.call(ps, function (p, i) { if (p.offsetTop <= top) n = i + 1; });
      return n;
    }
    function go(n, yPct) {
      var d = byId[cur.doc]; n = Math.max(1, Math.min(d.pageCount, n));
      var p = body.querySelectorAll(".rv-m-page")[n - 1];
      if (!p) return;
      var y = p.offsetTop - 12 + (yPct ? p.offsetHeight * yPct / 100 - 24 : 0);
      body.scrollTo({ top: y, behavior: RM ? "auto" : "smooth" });
      pnEl.textContent = "Сторінка " + n + " з " + d.pageCount;
    }
    function zoom(dir) {
      var i = ZOOMS.indexOf(cur.zoom) + dir;
      if (i < 0 || i >= ZOOMS.length) return;
      var frac = body.scrollTop / Math.max(1, body.scrollHeight);
      cur.zoom = ZOOMS[i];
      body.style.setProperty("--z", cur.zoom);
      zoomEl.textContent = Math.round(cur.zoom * 100) + "%";
      requestAnimationFrame(function () { body.scrollTop = frac * body.scrollHeight; });
    }
    function open(docId, page, key, from) {
      if (!dlg) build();
      opener = from;
      var d = byId[docId];
      cur.doc = docId; cur.key = key || null; cur.zoom = 1;
      body.style.setProperty("--z", 1); zoomEl.textContent = "100%";
      title.textContent = d.title;
      kindEl.textContent = (d.placeholder ? "Заглушка: тут буде справжній знеособлений звіт" : d.kind) + " · " + kindLine(d);
      pdfA.href = d.pdf; dlA.href = d.pdf; dlA.setAttribute("download", pdfName(d));
      body.innerHTML = "";
      d.pages.forEach(function (p) {
        var fig = h("figure", { class: "rv-m-page" });
        var wrap = h("div", { class: "rv-m-wrap", style: "aspect-ratio:1 / " + p.ratio });
        wrap.appendChild(h("img", { src: p.src2x, alt: d.title + ". Сторінка " + p.n + " з " + d.pageCount, loading: p.n > 2 ? "lazy" : null, decoding: "async" }));
        d.highlights.forEach(function (x) {
          if (x.page === p.n && x.key === cur.key) wrap.appendChild(h("i", { class: "rv-hl rv-hl-" + x.key, "aria-hidden": "true", style: "left:" + x.x + "%;top:" + x.y + "%;width:" + x.w + "%;height:" + x.h + "%" }));
        });
        fig.appendChild(wrap);
        fig.appendChild(h("figcaption", { class: "sr", text: "Текст сторінки " + p.n + ": " + p.text }));
        body.appendChild(fig);
      });
      tocEl.innerHTML = "";
      tocEl.appendChild(h("p", { class: "rv-toc-h", text: "Зміст" }));
      d.toc.forEach(function (t) {
        tocEl.appendChild(h("button", { type: "button", class: "rv-toc-i", onclick: function () { go(t.page, t.y); } }, [h("span", { text: t.title }), h("small", { text: "с. " + t.page })]));
      });
      document.documentElement.classList.add("rv-lock");
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      var hl = cur.key ? d.highlights.filter(function (x) { return x.key === cur.key; })[0] : null;
      requestAnimationFrame(function () {
        body.scrollTop = 0;
        if (hl) go(hl.page, hl.y); else if (page > 1) go(page);
        pnEl.textContent = "Сторінка " + (hl ? hl.page : page || 1) + " з " + d.pageCount;
        body.focus({ preventScroll: true });
      });
      if (window.TWstat) window.TWstat("report");
    }
    return { open: open };
  })();

  window.RV = { mount: mount, open: function (docId, page, key) { Modal.open(docId, page, key, document.activeElement); }, data: DATA, byId: byId, ICON: ICON };
})();
