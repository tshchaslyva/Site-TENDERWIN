# -*- coding: utf-8 -*-
"""
Збірка прототипів етапу 1 (інструкція v3.0): design3/src/*.html → design3/dist/*.html
  dosie.html   — А «Відкрите досьє»
  rozvytok.html — Г «Розвиток чинного сайту» (шаблон готує make_rozvytok.py із site/index.html)
  shliakh.html — Б «Шлях до рішення»
  spokii.html  — В «Точність і спокій»
  index.html / gallery.html — порівняння
Спершу: python3 design3/report/prepare.py (сторінки звіту → design3/dist/report/)
Запуск:  python3 design3/build.py
Прототипи ізольовані: форма нічого не надсилає, віджет дзвінка не підключено, статистика не збирається, noindex.
"""
import json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PRIVATE = "--private" in sys.argv   # справжні звіти клієнтів: лише design3/dist-private/ (у .gitignore)
SRC, PUB = os.path.join(HERE, "src"), os.path.join(HERE, "dist")
DIST = os.path.join(HERE, "dist-private") if PRIVATE else PUB
sys.path.insert(0, HERE)
from content import T, RES_LIST, STEPS, FAQ  # noqa: E402

PAGES = {
    "dosie.html": ("А", "Відкрите досьє"),
    "rozvytok.html": ("Г", "Розвиток чинного сайту"),
    "shliakh.html": ("Б", "Шлях до рішення"),
    "spokii.html": ("В", "Точність і спокій"),
}
ORDER = list(PAGES)

def read(name):
    return open(os.path.join(SRC, name), encoding="utf-8").read()


REPORTS = json.load(open(os.path.join(DIST, "report", "reports.json"), encoding="utf-8"))
ICON_PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.5l1.8 4.4-2.3 1.4a11 11 0 0 0 6.2 6.2l1.4-2.3L20 15.5V19a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.2 2 2 0 0 1 5 4z"/></svg>'
ICON_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'


def faq_html():
    out = ['<div class="faq">']
    for i, (q, a) in enumerate(FAQ):
        out.append(f'<details{" open" if i == 0 else ""}><summary><span>{q}</span><i aria-hidden="true"></i></summary><div class="ans">{a}</div></details>')
    out.append("</div>")
    return "".join(out)


def faq_jsonld():
    def plain(x):
        x = re.sub(r"</li>\s*<li>", " ", x)
        return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x).replace("&nbsp;", " ")).strip()
    return json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in FAQ]}, ensure_ascii=False)


def fld(fid, label, req=True, opt="", hint="", ph="", typ="text", area=False, mode=""):
    star = '<span aria-hidden="true"> *</span>' if req else ""
    o = f' <span class="opt">{opt}</span>' if opt else ""
    desc = f"{fid}-err" + (f" {fid}-hint" if hint else "")
    r = ' required aria-required="true"' if req else ""
    p = f' placeholder="{ph}"' if ph else ""
    im = f' inputmode="{mode}"' if mode else ""
    ctl = (f'<textarea id="{fid}" aria-describedby="{desc}"{p} maxlength="2400"></textarea><span class="count" id="{fid}-count" aria-live="polite">0 / 2000</span>' if area
           else f'<input id="{fid}" type="{typ}" aria-describedby="{desc}"{p}{r}{im} autocomplete="off">')
    hnt = f'<span class="hint" id="{fid}-hint">{hint}</span>' if hint else ""
    return f'<div class="fld"><label for="{fid}">{label}{star}{o}</label>{ctl}{hnt}<span class="err" id="{fid}-err" aria-live="polite"></span></div>'


def form_html(btn_cls):
    return f'''<form class="tw-form" data-demo novalidate aria-label="Заявка на аналіз (демонстрація)">
  <div class="row2">{fld("f-name", "Ім’я")}{fld("f-mail", "Електронна пошта", hint="Для підтвердження заявки, рахунку й аналізу.", ph="name@company.ua", typ="email")}</div>
  {fld("f-tender", "ID або посилання на закупівлю", hint="Формат ID: UA-РРРР-ММ-ДД-000000-a. Можна вставити посилання з Prozorro.")}
  {fld("f-org", "Назва учасника / ПІБ ФОП", hint="Як у тендерній пропозиції.")}
  {fld("f-code", "Код ЄДРПОУ або РНОКПП ФОП", hint="8 цифр — ЄДРПОУ, 10 цифр — РНОКПП.", mode="numeric")}
  <label class="chk"><input type="checkbox" id="f-nocode"><span>Коду немає — уточню окремо</span></label>
  <div class="row2">{fld("f-lot", "Лот / рішення", req=False, opt="(за потреби)", ph="Наприклад, лот 2")}{fld("f-contact", "Телефон або Telegram для уточнень", ph="+380 … або @username")}</div>
  {fld("f-msg", "Коротко про ситуацію", req=False, opt="(необов’язково)", ph="Коли оприлюднено рішення, чи спливає строк оскарження", area=True)}
  <label class="chk"><input type="checkbox" id="f-payer"><span>Рахунок оплачуватиме інша особа, ніж учасник (дані платника уточнимо до рахунку)</span></label>
  <label class="chk"><input type="checkbox" id="f-ok" aria-describedby="f-ok-err"><span>{T["CONSENT"]}</span></label>
  <span class="err" id="f-ok-err" aria-live="polite"></span>
  <button type="submit" class="{btn_cls}">{T["FORM_BTN"]}</button>
  <div class="msg" role="status" aria-live="polite"></div>
  <p class="note">{T["FORM_NOTE"]}</p>
</form>
<div class="demo-states" aria-label="Демонстрація станів форми"><p>Прототип: показати стан форми</p><div>
  <button type="button" data-state="error">Помилка в полях</button><button type="button" data-state="sending">Надсилання</button>
  <button type="button" data-state="saved">Збережено</button><button type="button" data-state="delayed">Лист затримався</button><button type="button" data-state="">Скинути</button></div></div>'''


def contacts_html():
    return f'''<ul class="contacts">
  <li><span class="k">Телефон</span><a class="v" href="{T["PHONE_HREF"]}">{T["PHONE"]}</a></li>
  <li><span class="k">Зворотний дзвінок</span><a class="v" href="#cb" data-callback>Замовити дзвінок</a></li>
  <li><span class="k">Telegram</span><a class="v" href="{T["TG_URL"]}" target="_blank" rel="noopener">{T["TG"]}</a></li>
  <li><span class="k">Пошта</span><a class="v" href="mailto:{T["EMAIL"]}">{T["EMAIL"]}</a></li>
  <li><span class="k">Виконавець</span><span class="v">{T["EXECUTOR"]}</span></li>
</ul>'''


def steps_html():
    out = []
    for i, (h, p, tag) in enumerate(STEPS, 1):
        t = f'<span class="tag">{tag}</span>' if tag else ""
        extra = f'<p class="iban"><b>Зараз:</b> {T["IBAN_NOTE"]}</p>' if i == 2 else ""
        out.append(f'<li class="step" data-r><span class="n">{i:02d}</span>{t}<h3>{h}</h3><p>{p}</p>{extra}</li>')
    return "".join(out)


def reslist_html():
    return "".join(f'<li data-r><span class="i">{i + 1:02d}</span><span>{t}</span></li>' for i, t in enumerate(RES_LIST))


def rv_fallback(doc_id):
    d = next((x for x in REPORTS["documents"] if x["id"] == doc_id), REPORTS["documents"][0])
    return (f'<figure class="rv-fallback"><img src="{d["pages"][0]["src"]}" alt="{d["title"]}, сторінка 1" width="1000" height="{int(1000 * d["pages"][0]["ratio"])}" loading="lazy">'
            f'<figcaption><a href="{d["pdf"]}">Відкрити PDF ({d["pageCount"]} с.)</a></figcaption></figure>')


def chips_html():
    names = {"pidstava": "Підстава", "dokument": "Документ", "ryzyk": "Ризик", "rekomendatsiia": "Рекомендація"}
    return "".join(f'<button type="button" class="chip chip-{k}" data-key="{k}" aria-pressed="false"><i aria-hidden="true"></i>{v}</button>' for k, v in names.items())


def mbar_html(btn_cls):
    return (f'<nav class="mbar" id="mbar" aria-label="Замовлення"><span class="t">{T["MOBILE"]}</span>'
            f'<a class="{btn_cls}" href="#zayavka">{T["BTN"]}</a>'
            f'<a class="call" href="{T["PHONE_HREF"]}" aria-label="Зателефонувати: +380 800 357 135">{ICON_PHONE}</a></nav>')


def callback_html():
    return (f'<button type="button" class="cb" id="cb" aria-expanded="false" aria-controls="cb-pop">{ICON_PHONE}<span>Зворотний дзвінок</span></button>'
            '<div class="cb-pop" id="cb-pop" role="dialog" aria-label="Зворотний дзвінок" hidden>'
            '<button type="button" class="cb-x" aria-label="Закрити">✕</button>'
            '<h2>Зателефонуйте мені, будь ласка</h2><label for="cb-tel">Телефон</label><input id="cb-tel" type="tel" placeholder="+380 …" disabled>'
            '<button type="button" class="cb-send" disabled>Замовити дзвінок</button>'
            '<p class="cb-note">Місце штатного віджета Zadarma. У прототипі дзвінок не замовляється; у робочій версії — після отримання коду віджета й графіка відповіді.</p></div>')


def privacy_html():
    return ('<details id="privacy" class="privacy"><summary>Політика конфіденційності</summary>'
            '<p>У прототипі — місце чинної політики конфіденційності сайту. На етапі 2 текст переноситься з робочого сайту й оновлюється '
            'з урахуванням фактично підключених сервісів (віджет Zadarma, статистика відвідувань без cookie).</p></details>')


def proto_bar(name):
    letter, title = PAGES[name]
    i = ORDER.index(name)
    nxt = ORDER[(i + 1) % len(ORDER)]
    return (f'<div class="proto"><a href="./">← Усі концепції</a><span>Прототип {letter} · <b>«{title}»</b> · етап 1, демонстрація</span>'
            f'<a href="{nxt}">{PAGES[nxt][0]}<span class="pn"> «{PAGES[nxt][1]}»</span> →</a></div>')


PROTO_CSS = (".proto{position:relative;z-index:300;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 16px;"
             "background:#111318;color:#c9ccd3;font:500 13px/1.3 system-ui,sans-serif}.proto a{color:#fff;font-weight:600;text-decoration:none;white-space:nowrap}"
             ".proto a:hover{text-decoration:underline}.proto b{color:#fff}@media(max-width:620px){.proto>span{display:none}}@media(max-width:420px){.proto .pn{display:none}}")
HOME_JS = ('<script>if(/githack\\.com$/.test(location.hostname)||location.protocol==="file:")'
           'document.querySelector(".proto a").href="index.html"</script>')


PRELOAD = {   # шрифти першого екрана (кирилиця + латиниця з цифрами) — щоб текст не перемальовувався після завантаження (CLS)
    "dosie.html": ["SourceSerif4-600-normal-cyrillic.woff2", "SourceSerif4-600-normal-latin.woff2", "Onest-400-normal-cyrillic.woff2",
                   "Onest-400-normal-latin.woff2", "IBMPlexMono-500-normal-cyrillic.woff2", "IBMPlexMono-500-normal-latin.woff2"],
    "shliakh.html": ["Geologica-800-normal-cyrillic.woff2", "Geologica-800-normal-latin.woff2", "Geologica-400-normal-cyrillic.woff2", "Geologica-400-normal-latin.woff2"],
    "spokii.html": ["FixelDisplay-ExtraBold.woff2", "FixelText-Regular.woff2"],
    "rozvytok.html": ["FixelDisplay-ExtraBold.woff2", "FixelText-Regular.woff2", "FixelText-Bold.woff2"],
}


def head(title, desc, name=""):
    pre = "".join(f'\n<link rel="preload" href="fonts/{f}" as="font" type="font/woff2" crossorigin>' for f in PRELOAD.get(name, []))
    return f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="noindex, nofollow">{pre}
<link rel="stylesheet" href="fonts.css">'''


def render(name):
    s = read(name)
    rep = dict(T)
    rep.update({
        "CORE_CSS": read("core3.css"), "VIEWER_CSS": read("viewer.css"), "CORE_JS": read("core3.js"), "VIEWER_JS": read("viewer.js"),
        "REPORTS_JSON": json.dumps(REPORTS, ensure_ascii=False), "FAQ": faq_html(), "FAQ_JSONLD": faq_jsonld(), "CONTACTS": contacts_html(),
        "STEPS": steps_html(), "RESLIST": reslist_html(), "CHIPS": chips_html(), "CALLBACK": callback_html(), "PRIVACY": privacy_html(),
        "DOC_FOCUS_PAGE": str(REPORTS["documents"][0]["focus"]["page"]), "DOC_PAGES": str(REPORTS["documents"][0]["pageCount"]), "DOC_SECTIONS": str(len(REPORTS["documents"][0]["toc"])),
        "ROZVYTOK_CSS": read("rozvytok.css"), "ROZVYTOK_JS": read("rozvytok.js"),
        "PROTO": proto_bar(name) + HOME_JS, "PROTO_CSS": PROTO_CSS, "ICON_ARROW": ICON_ARROW, "ICON_PHONE": ICON_PHONE,
    })
    s = re.sub(r"\{\{FORM:([^}]*)\}\}", lambda m: form_html(m.group(1)), s)
    s = re.sub(r"\{\{MBAR:([^}]*)\}\}", lambda m: mbar_html(m.group(1)), s)
    s = re.sub(r"\{\{RVFALLBACK:(\w+)\}\}", lambda m: rv_fallback(m.group(1)), s)
    s = re.sub(r"\{\{HEAD\}\}", lambda m: head(T["TITLE"] + f" · прототип {PAGES[name][0]}", T["DESC"], name), s)

    def sub(m):
        k = m.group(1)
        if k not in rep:
            raise KeyError(f"{name}: невідоме місце {{{{{k}}}}}")
        return rep[k]
    return re.sub(r"\{\{([A-Z0-9_]+)\}\}", sub, s)


REPORT_NOTE_PUBLIC = ("<b>Публічна версія.</b> Замість звіту — позначена заглушка з вигаданими даними. Чорнетка справжнього аналізу містить дані клієнта, "
                      "тому показується лише в приватній версії за окремим посиланням. Після погодження концепції її замінять два чистові знеособлені аналізи: "
                      "з рекомендацією оскаржувати і без неї.")
REPORT_NOTE_PRIVATE = ("<b>Приватна версія — не пересилайте стороннім.</b> У переглядачі всіх прототипів першою стоїть чорнетка справжнього аналізу "
                       "(оскаржувати не рекомендовано) з даними клієнта; друга вкладка — заглушка з вигаданими даними. Це чорнетка: після погодження концепції "
                       "її замінять два чистові знеособлені аналізи — з рекомендацією оскаржувати і без неї. Знімки на цій сторінці — з публічної версії.")


if __name__ == "__main__":
    built = []
    if PRIVATE:   # спільні файли (шрифти, знімки) — з публічної збірки
        for item in ("fonts", "shots", "fonts.css"):
            src, dst = os.path.join(PUB, item), os.path.join(DIST, item)
            if os.path.isdir(src): shutil.copytree(src, dst, dirs_exist_ok=True)
            elif os.path.exists(src): shutil.copy(src, dst)
    for f in ORDER:
        if os.path.exists(os.path.join(SRC, f)):
            open(os.path.join(DIST, f), "w", encoding="utf-8").write(render(f))
            built.append(f)
    g = os.path.join(SRC, "gallery.html")
    if os.path.exists(g):
        body = open(g, encoding="utf-8").read().replace("{{REPORT_NOTE}}", REPORT_NOTE_PRIVATE if PRIVATE else REPORT_NOTE_PUBLIC)
        open(os.path.join(DIST, "gallery.html"), "w", encoding="utf-8").write(body)
        open(os.path.join(DIST, "index.html"), "w", encoding="utf-8").write(
            '<!DOCTYPE html>\n<html lang="uk">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<meta name="robots" content="noindex, nofollow">\n</head>\n<body>\n' + body + '\n</body>\n</html>\n')
        built.append("gallery.html + index.html")
    print("готово:", ", ".join(built))
