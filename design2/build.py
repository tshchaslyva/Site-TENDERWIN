# -*- coding: utf-8 -*-
"""
Збірка п'яти концепцій ребрендингу TenderWin → design2/dist/c1.html … c5.html (+ index.html — галерея).
Запуск: python3 design2/build.py
Шаблони — design2/src/cN.html з місцями {{...}}; затверджені тексти й кейси — з одного джерела (тут і cases.json),
тому однакові в усіх концепціях.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, DIST = os.path.join(HERE, "src"), os.path.join(HERE, "dist")
sys.path.insert(0, os.path.join(HERE, "..", "design"))
from content import FAQ, nw  # noqa: E402  (тексти FAQ розділу 6.6 — дослівно, як на сайті)

NB = "&nbsp;"
T = {
    "KICKER": "Для учасників публічних закупівель Prozorro",
    "H1": f"Аналіз відхилення тендерної пропозиції за{NB}24{NB}години",
    "LEDE": ("Допоможемо оцінити, чи є підстави оскаржувати відхилення. Перевіримо аргументи замовника за документами "
             f"Вашої закупівлі, підготуємо письмовий висновок і пояснимо його на {nw('30-хвилинній')} консультації."),
    "PRICE": f"3{NB}499{NB}грн",
    "OFFER_MAIN": "за аналіз і консультацію",
    "OFFER_SUB": f"Письмовий аналіз протягом 24{NB}годин після оплати. Консультація після отримання висновку в погоджений час.",
    "NOTE": "Перед оплатою підтвердимо обсяг роботи та можливість виконати її вчасно.",
    "BTN": "Замовити аналіз",
    "BTN2": "Подивитися приклад висновку",
    "RES_H2": "Письмовий висновок, який допомагає прийняти рішення",
    "RES_LEDE": "У висновку розглянемо кожну підставу відхилення та покажемо, на яких документах ґрунтується оцінка.",
    "CONS_H3": "30 хвилин для пояснення висновків",
    "CONS_TEXT": ("На консультації розберемо незрозумілі моменти, відповімо на Ваші запитання щодо аналізу та обговоримо "
                  "можливі наступні кроки. Консультація входить у ціну послуги."),
    "RES_NOTE": ("Якщо документи не дають достатніх підстав рекомендувати оскарження, пояснимо це у висновку. "
                 "Якщо для оцінки бракує даних, прямо зазначимо обмеження."),
    "CASES_H2": "Так виглядає результат нашої роботи",
    "CASES_LEDE": ("Три демонстраційні справи з різним результатом. Ми не завжди радимо оскаржувати: інколи найцінніше — "
                   "вчасно дізнатися, що скарга не має шансів."),
    "PDF": "Завантажити приклад висновку (PDF)",
    "HOW_H2": "Як замовити аналіз і консультацію",
    "PRICE_H2": f"Аналіз відхилення та {nw('30-хвилинна')} консультація",
    "PRICE_DESC": ("Письмовий аналіз із посиланнями на документи, оцінка кожної підстави відхилення, рекомендації щодо "
                   "наступних дій та одна консультація за результатами аналізу."),
    "PRICE_INCL": "Консультація входить у ціну послуги.",
    "PRICE_LIMITS": ("Підготовка і подання скарги, представництво та плата за подання скарги до цієї послуги не входять. "
                     "Рішення органу оскарження не залежить від TenderWin."),
    "CONTRACT": "Працюємо за договором. Надаємо рахунок і акт наданих послуг.",
    "REMOTE": "Працюємо дистанційно з учасниками закупівель по всій Україні.",
    "FAQ_H2": "Що зазвичай запитують",
    "FORM_H2": "Замовити аналіз відхилення",
    "FORM_SUB": f"Аналіз і {nw('30-хвилинна')} консультація за 3{NB}499{NB}грн. Після заявки підтвердимо можливість виконання та надішлемо умови оплати.",
    "CONT_H": "Маєте запитання?",
    "CONT_TEXT": (f"Зателефонуйте за номером +380{NB}800{NB}357{NB}135 або напишіть нам у Telegram: @TenderWin_UA. "
                  "Для оформлення замовлення заповніть заявку на сайті."),
    "FOOT": (f"TenderWin. Аналіз відхилення тендерної пропозиції та {nw('30-хвилинна')} консультація за 3{NB}499{NB}грн. "
             f"Письмовий аналіз протягом 24{NB}годин після оплати погодженого замовлення."),
    "EXECUTOR": "ФОП Щасливий Віталій Олександрович",
    "PHONE": f"+380{NB}800{NB}357{NB}135",
    "PHONE_HREF": "tel:+380800357135",
    "EMAIL": "vitalii@tenderwin.com.ua",
    "TG": "@TenderWin_UA",
    "TG_URL": "https://t.me/tenderwin_ua",
    "MOBILE": f"3{NB}499{NB}грн · консультація включена",
}
STEPS = [
    ("Заповніть заявку", "Укажіть закупівлю, учасника та контакти для зв’язку. Для багатолотової закупівлі зазначте потрібний лот.", ""),
    ("Погодьте обсяг роботи та оплатіть рахунок", f"Перевіримо вихідні дані й можливість виконати аналіз вчасно, погодимо умови та надішлемо рахунок на 3{NB}499{NB}грн.", ""),
    ("Отримайте письмовий аналіз", f"Підготуємо висновок протягом 24{NB}годин після зарахування оплати. Точний строк підтвердимо в листі.", "24 години"),
    ("Обговоріть висновки на консультації", f"Після передання аналізу погодимо час {nw('30-хвилинної')} консультації. Вона вже входить у сплачену вартість.", "30 хвилин"),
]
RES_LIST = [
    "Що саме зазначив замовник у рішенні про відхилення.",
    "Яка вимога документації стосується цієї підстави.",
    "Що міститься у відповідних документах Вашої пропозиції.",
    "Які аргументи підтримують оскарження, а які послаблюють позицію.",
    "Які наступні дії доцільно розглянути та які ризики врахувати.",
]
CASES = json.load(open(os.path.join(HERE, "cases.json"), encoding="utf-8"))


def faq_html():
    out = ['<div class="faq">']
    for i, (q, a) in enumerate(FAQ):
        out.append(f'<details{" open" if i == 0 else ""}><summary><span>{q}</span><i aria-hidden="true"></i></summary><div class="ans">{a}</div></details>')
    out.append("</div>")
    return "".join(out)


def fld(fid, label, req=True, opt="", hint="", ph="", typ="text", area=False):
    star = '<b class="req" aria-hidden="true">*</b>' if req else ""
    o = f' <span class="opt">{opt}</span>' if opt else ""
    desc = f'{fid}-err' + (f' {fid}-hint' if hint else "")
    r = " required" if req else ""
    p = f' placeholder="{ph}"' if ph else ""
    ctl = (f'<textarea id="{fid}" aria-describedby="{desc}"{p}></textarea>' if area
           else f'<input id="{fid}" type="{typ}" aria-describedby="{desc}"{p}{r}>')
    h = f'<span class="hint" id="{fid}-hint">{hint}</span>' if hint else ""
    return f'<div class="fld"><label for="{fid}">{label}{star}{o}</label>{ctl}{h}<span class="err" id="{fid}-err" aria-live="polite"></span></div>'


def form_html(btn_cls="btn btn-primary"):
    return f'''<form class="tw-form" data-demo novalidate>
  <div class="row2">{fld("f-name", "Ім’я")}{fld("f-mail", "Електронна пошта", hint="Для підтвердження заявки, рахунку й аналізу.", ph="name@company.ua", typ="email")}</div>
  {fld("f-tender", "ID або посилання на закупівлю", hint="Формат ID: UA-РРРР-ММ-ДД-000000-a. Можна вставити посилання з Prozorro.")}
  {fld("f-org", "Назва учасника / ПІБ ФОП", hint="Як у тендерній пропозиції.", ph="ТОВ «…» або ФОП Прізвище Ім’я По батькові")}
  {fld("f-code", "Код ЄДРПОУ або РНОКПП ФОП", hint="8 цифр — ЄДРПОУ, 10 цифр — РНОКПП.")}
  <label class="chk"><input type="checkbox"><span>Коду немає — уточню окремо</span></label>
  <div class="row2">{fld("f-lot", "Лот", req=False, opt="(якщо їх кілька)", ph="Наприклад, лот 2")}{fld("f-contact", "Телефон або Telegram", req=False, opt="(рекомендовано)", ph="+380 … або @username")}</div>
  {fld("f-msg", "Коротко про ситуацію", req=False, opt="(необов’язково)", ph="Коли оприлюднено рішення, чи спливає строк оскарження", area=True)}
  <label class="chk"><input type="checkbox"><span>Рахунок оплачуватиме інша особа, ніж учасник</span></label>
  <label class="chk"><input type="checkbox" id="f-ok" required aria-describedby="f-ok-err"><span>Погоджуюся на обробку моїх персональних даних для опрацювання цього звернення відповідно до <a href="#privacy">політики конфіденційності</a>.</span></label>
  <span class="err" id="f-ok-err" aria-live="polite"></span>
  <button type="submit" class="{btn_cls}"><span>Надіслати заявку</span></button>
  <div class="msg" role="status" aria-live="polite"></div>
  <p class="note">Надсилання заявки не є оплатою. Не вставляйте в поле повідомлення паролі, банківські дані або конфіденційні документи.</p>
</form>'''


def contacts_html():
    return f'''<ul class="contacts">
  <li><span class="k">Телефон</span><a class="v" href="{T["PHONE_HREF"]}">{T["PHONE"]}</a></li>
  <li><span class="k">Telegram</span><a class="v" href="{T["TG_URL"]}" target="_blank" rel="noopener">{T["TG"]}</a></li>
  <li><span class="k">Пошта</span><a class="v" href="mailto:{T["EMAIL"]}">{T["EMAIL"]}</a></li>
  <li><span class="k">Виконавець</span><span class="v">{T["EXECUTOR"]}</span></li>
</ul>'''


def steps_html(item_cls="step"):
    out = []
    for i, (h, p, tag) in enumerate(STEPS, 1):
        t = f'<span class="tag">{tag}</span>' if tag else ""
        out.append(f'<li class="{item_cls}" data-r data-d="{(i - 1) * 110}"><span class="n">{i:02d}</span>{t}<h3>{h}</h3><p>{p}</p></li>')
    return "".join(out)


def reslist_html():
    return "".join(f'<li data-r data-d="{i * 80}"><span class="i">{i + 1:02d}</span><span>{t}</span></li>' for i, t in enumerate(RES_LIST))


def faq_jsonld():
    def plain(h):
        h = re.sub(r"</li>\s*<li>", " ", h)
        return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h).replace("&nbsp;", " ")).strip()
    return json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in FAQ]}, ensure_ascii=False)


CORE_JS = open(os.path.join(SRC, "core.js"), encoding="utf-8").read()
CORE_CSS = open(os.path.join(SRC, "core.css"), encoding="utf-8").read()


def head(title, desc):
    return f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="fonts.css">'''


def render(name):
    s = open(os.path.join(SRC, name), encoding="utf-8").read()
    rep = dict(T)
    rep.update({
        "FAQ": faq_html(), "CONTACTS": contacts_html(), "STEPS": steps_html(), "RESLIST": reslist_html(),
        "CASES_JSON": json.dumps(CASES, ensure_ascii=False), "CORE_JS": CORE_JS, "CORE_CSS": CORE_CSS,
        "FAQ_JSONLD": faq_jsonld(), "DISCLAIMER": CASES["disclaimer"],
    })
    s = re.sub(r"\{\{FORM:([^}]*)\}\}", lambda m: form_html(m.group(1)), s)
    s = re.sub(r"\{\{HEAD:([^|}]*)\|([^}]*)\}\}", lambda m: head(m.group(1), m.group(2)), s)
    def sub(m):
        k = m.group(1)
        if k not in rep:
            raise KeyError(f"{name}: невідоме місце {{{{{k}}}}}")
        return rep[k]
    s = re.sub(r"\{\{([A-Z0-9_]+)\}\}", sub, s)
    return s


NAMES = {1: "Протокол", 2: "Кінетика", 3: "Аналізатор", 4: "Атлас", 5: "Ясно"}
GBAR_CSS = ("<style>.gbar{position:relative;z-index:300;display:flex;justify-content:space-between;align-items:center;gap:12px;"
            "padding:8px 16px;background:#111318;color:#C9CCD3;font:500 13px/1.3 system-ui,sans-serif}"
            ".gbar a{color:#fff;text-decoration:none;font-weight:600;white-space:nowrap}.gbar a:hover{text-decoration:underline}"
            ".gbar b{color:#fff}@media(max-width:520px){.gbar span{display:none}}</style>")


def gbar(n):
    nxt = n % 5 + 1
    return (f'{GBAR_CSS}<div class="gbar"><a href="./">← Усі концепції</a>'
            f'<span>Концепція {n} з 5 · <b>«{NAMES[n]}»</b> · демонстраційний макет</span>'
            f'<a href="c{nxt}.html">«{NAMES[nxt]}» →</a></div>')


if __name__ == "__main__":
    os.makedirs(DIST, exist_ok=True)
    built = []
    for f in sorted(os.listdir(SRC)):
        m = re.match(r"c(\d)\.html$", f)
        if m:
            html = render(f).replace("<body>", "<body>\n" + gbar(int(m.group(1))), 1)
            open(os.path.join(DIST, f), "w", encoding="utf-8").write(html)
            built.append(f)
    # галерея: gallery.html — для публікації (без власного <!DOCTYPE>), index.html — для перегляду локально
    g = os.path.join(SRC, "gallery.html")
    if os.path.exists(g):
        body = open(g, encoding="utf-8").read()
        open(os.path.join(DIST, "gallery.html"), "w", encoding="utf-8").write(body)
        open(os.path.join(DIST, "index.html"), "w", encoding="utf-8").write(
            '<!DOCTYPE html>\n<html lang="uk">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '</head>\n<body>\n' + body + '\n</body>\n</html>\n')
        built.append("gallery.html + index.html")
    print("готово:", ", ".join(built))
