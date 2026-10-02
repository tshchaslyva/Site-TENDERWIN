# -*- coding: utf-8 -*-
"""
Спільний зміст п'яти варіантів дизайну TenderWin.
Тексти — дослівно з розділу 6 інструкції v2.0 (зміни лише типографічні: нерозривні пробіли, «Ви», апостроф ’).
Кожен варіант використовує ці фрагменти й лише по-різному їх компонує та оформлює.
"""

NB = "&nbsp;"
PRICE = "3&nbsp;499&nbsp;грн"
PHONE = "+380&nbsp;800&nbsp;357&nbsp;135"
PHONE_HREF = "tel:+380800357135"
EMAIL = "vitalii@tenderwin.com.ua"
TG_USER = "@TenderWin_UA"
TG_URL = "https://t.me/tenderwin_ua"
CH_URL = "https://t.me/tenderwin_plus"
CH_LABEL = "Тендер+ — щотижневий розбір відхилень"
MIN30 = '<span class="nw">30-хвилинна</span>'


def nw(word):
    return f'<span class="nw">{word}</span>'


# ---------------- 1. Перший екран ----------------
KICKER = "Для учасників публічних закупівель Prozorro"
H1 = f"Аналіз відхилення тендерної пропозиції за{NB}24{NB}години"
LEDE = ("Допоможемо оцінити, чи є підстави оскаржувати відхилення. Перевіримо аргументи замовника за документами "
        f"Вашої закупівлі, підготуємо письмовий висновок і пояснимо його на {nw('30-хвилинній')} консультації.")
OFFER_MAIN = f'<span class="price">{PRICE}</span> за аналіз і консультацію'
OFFER_SUB = f"Письмовий аналіз протягом 24{NB}годин після оплати. Консультація після отримання висновку в погоджений час."
BTN_MAIN = "Замовити аналіз"
BTN_SECOND = "Що входить у послугу"
HERO_NOTE = "Перед оплатою підтвердимо обсяг роботи та можливість виконати її вчасно."

# ---------------- 2. Що Ви отримаєте ----------------
RES_EYEBROW = "Що Ви отримаєте"
RES_H2 = "Письмовий висновок, який допомагає прийняти рішення"
RES_LEDE = "У висновку розглянемо кожну підставу відхилення та покажемо, на яких документах ґрунтується оцінка."
RES_LIST = [
    "Що саме зазначив замовник у рішенні про відхилення.",
    "Яка вимога документації стосується цієї підстави.",
    "Що міститься у відповідних документах Вашої пропозиції.",
    "Які аргументи підтримують оскарження, а які послаблюють позицію.",
    "Які наступні дії доцільно розглянути та які ризики врахувати.",
]
CONS_H3 = "30 хвилин для пояснення висновків"
CONS_TEXT = ("На консультації розберемо незрозумілі моменти, відповімо на Ваші запитання щодо аналізу та обговоримо "
             "можливі наступні кроки. Консультація входить у ціну послуги.")
RES_NOTE = ("Якщо документи не дають достатніх підстав рекомендувати оскарження, пояснимо це у висновку. "
            "Якщо для оцінки бракує даних, прямо зазначимо обмеження.")
STRUCT_LABEL = "Структура висновку"
STRUCT_CAPTION = "Структура висновку. Це схема документа, а не виконаний кейс"

# ---------------- 3. Хто відповідає ----------------
WHO_EYEBROW = "Хто працює з Вашим замовленням"
WHO_H2 = "Хто відповідає за аналіз"
WHO_NAME = "Віталій Щасливий"
WHO_QUOTE = ("Я відповідаю за висновки TenderWin і проводжу консультацію за результатами аналізу. "
             "Моя мета — пояснити, на чому ґрунтується Ваша позиція, де є ризики та які наступні дії варто розглянути.")
WHO_META = "Виконавець — ФОП Щасливий Віталій Олександрович."
WHO_PHOTO_NOTE = "Місце для справжньої фотографії (за згодою)"

# ---------------- 4. Як замовити ----------------
HOW_EYEBROW = "Як замовити"
HOW_H2 = "Як замовити аналіз і консультацію"
STEPS = [
    ("Заповніть заявку", "Укажіть закупівлю, учасника та контакти для зв’язку. Для багатолотової закупівлі зазначте потрібний лот.", ""),
    ("Погодьте обсяг роботи та оплатіть рахунок", f"Перевіримо вихідні дані й можливість виконати аналіз вчасно, погодимо умови та надішлемо рахунок на {PRICE}.", ""),
    ("Отримайте письмовий аналіз", f"Підготуємо висновок протягом 24{NB}годин після зарахування оплати. Точний строк підтвердимо в листі.", "24 години"),
    ("Обговоріть висновки на консультації", f"Після передання аналізу погодимо час {nw('30-хвилинної')} консультації. Вона вже входить у сплачену вартість.", "30 хвилин"),
]

# ---------------- 5. Вартість ----------------
PRICE_EYEBROW = "Вартість послуги"
PRICE_H2 = f"Аналіз відхилення та {MIN30} консультація"
PRICE_DESC = ("Письмовий аналіз із посиланнями на документи, оцінка кожної підстави відхилення, рекомендації щодо "
              "наступних дій та одна консультація за результатами аналізу.")
PRICE_LIMITS = ("Підготовка і подання скарги, представництво та плата за подання скарги до цієї послуги не входять. "
                "Рішення органу оскарження не залежить від TenderWin.")
PRICE_INCL = "Консультація входить у ціну послуги."
CONTRACT = "Працюємо за договором. Надаємо рахунок і акт наданих послуг."
REMOTE = "Працюємо дистанційно з учасниками закупівель по всій Україні."

# ---------------- 6. FAQ ----------------
FAQ = [
    ("Як відбувається опрацювання моєї справи і коли я отримаю аналіз?",
     "<p>Після зарахування оплати ми беремо справу в роботу.</p><ol>"
     "<li>Збираємо першоджерела з Prozorro: рішення замовника про відхилення, тендерну документацію, Вашу пропозицію та листування за закупівлею.</li>"
     "<li>Розбираємо кожну підставу відхилення окремо: що написав замовник, що вимагала документація і що є у Ваших документах.</li>"
     "<li>Якщо для висновку бракує даних, уточнюємо їх у Вас телефоном або в Telegram — тому вкажіть у заявці контакт, за яким Ви на зв’язку.</li>"
     "<li>Перед надсиланням висновок проходить незалежну перевірку.</li>"
     "<li>Готовий аналіз надсилаємо на Вашу електронну пошту окремим документом із посиланнями на джерела — до 24 годин з моменту зарахування оплати.</li></ol>"),
    ("Коли відбудеться консультація?",
     f"<p>Після того як Ви отримаєте письмовий висновок. Час і спосіб зв’язку погодимо з Вами. Одна {MIN30} консультація "
     f"за результатами аналізу входить у вартість {PRICE}. Строк 24 години стосується підготовки письмового аналізу.</p>"),
    ("Що потрібно для початку?",
     "<p>Заповніть заявку на сайті: укажіть ID або посилання на закупівлю, дані учасника й контакти. Якщо потрібного документа "
     "немає у відкритому доступі, узгодимо його передання до початку роботи.</p>"),
    ("Чи підготуєте Ви скаргу?",
     "<p>Ця послуга включає аналіз відхилення та консультацію щодо висновків. Підготовка й подання скарги до неї не входять.</p>"),
    ("Що буде, якщо підстав для оскарження недостатньо?",
     "<p>Ви отримаєте висновок із поясненням причин і ризиків. На консультації розберемо ці висновки та можливі наступні дії. "
     "Оцінка слабкої позиції також є результатом аналізу; ми не обіцяємо позитивної рекомендації незалежно від документів.</p>"),
    (f"Чи входить плата за подання скарги у {PRICE}?",
     "<p>Ні. Це вартість аналізу та консультації. Якщо Ви вирішите подавати скаргу, плату за її подання потрібно врахувати "
     "окремо за правилами, що застосовуються до Вашої закупівлі.</p>"),
    ("Що робити, якщо строк оскарження спливає?",
     "<p>Укажіть це в заявці та зв’яжіться з нами за контактами на сайті. До оплати потрібно перевірити строк саме Вашої процедури "
     "та можливість виконати аналіз вчасно. Звернення до TenderWin й оплата аналізу не зупиняють строку оскарження.</p>"),
    ("Як оформлюється замовлення?",
     "<p>До оплати погоджуємо предмет, строк та умови послуги, після чого надсилаємо рахунок. Документи оформлюємо відповідно до погодженого договору.</p>"),
]
FAQ_EYEBROW = "Питання"
FAQ_H2 = "Що зазвичай запитують"

# ---------------- 7. Форма ----------------
FORM_EYEBROW = "Заявка"
FORM_H2 = "Замовити аналіз відхилення"
FORM_SUB = f"Аналіз і {nw('30-хвилинна')} консультація за {PRICE}. Після заявки підтвердимо можливість виконання та надішлемо умови оплати."
FORM_BTN = "Надіслати заявку"
FORM_NOTE = ("Надсилання заявки не є оплатою. Не вставляйте в поле повідомлення паролі, банківські дані або конфіденційні документи. "
             "За потреби погодимо спосіб передання матеріалів окремо.")
CONSENT = ("Погоджуюся на обробку моїх персональних даних для опрацювання цього звернення відповідно до "
           '<a href="#privacy">політики конфіденційності</a>.')
SAVED = ("Дякуємо! Заявку № Z-2026-10-02/1 збережено. Перед оплатою підтвердимо обсяг і строк роботи. "
         "Контактна адреса: name@company.ua.")
SAVED_MORE = (f'Поки чекаєте на відповідь: питання — у Telegram <a href="{TG_URL}">{TG_USER}</a>; '
              f'свіжі розбори відхилень — у каналі <a href="{CH_URL}">Тендер+</a>.')
FIELD_ERROR = "Вкажіть ID закупівлі у форматі UA-2026-09-30-000123-a або вставте посилання на закупівлю."

# ---------------- 8. Контакти ----------------
CONT_H = "Маєте запитання?"
CONT_TEXT = (f"Зателефонуйте за номером {PHONE}, замовте зворотний дзвінок або напишіть нам у Telegram: {TG_USER}. "
             "Для оформлення замовлення заповніть заявку на сайті.")

# ---------------- 9. Останні розбори (резерв) ----------------
POSTS_H = "Останні розбори"
POSTS_NOTE = "Віджет постів каналу «Тендер+» з’явиться, коли в каналі буде 3–4 пости. До того — лише посилання на канал."

# ---------------- footer ----------------
FOOT_1 = (f"TenderWin. Аналіз відхилення тендерної пропозиції та {MIN30} консультація за {PRICE}. "
          f"Письмовий аналіз протягом 24{NB}годин після оплати погодженого замовлення.")
FOOT_2 = "Тендер+ — щотижневий розбір відхилень у Telegram."
EXECUTOR = "ФОП Щасливий Віталій Олександрович"
MOBILE_TEXT = f"{PRICE} · консультація включена"

NAV = [("#rezultat", "Що входить"), ("#khto", "Хто відповідає"), ("#yak", "Як замовити"),
       ("#vartist", "Вартість"), ("#pytannya", "Питання"), ("#kontakty", "Контакти")]

# ================================================================
# HTML-фрагменти (класи оформлює кожен варіант по-своєму)
# ================================================================

ICONS = {
    "check": '<path d="m6 12.5 4 4L18 8"/>',
    "phone": '<path d="M5 4h3.5l1.8 4.4-2.3 1.4a11 11 0 0 0 6.2 6.2l1.4-2.3L20 15.5V19a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.2 2 2 0 0 1 5 4z"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    "tg": '<path d="M21.5 4.5 2.8 11.6c-.9.4-.9 1.6 0 1.9l4.6 1.5 1.8 5.3c.3.8 1.3 1 1.9.4l2.6-2.5 4.7 3.5c.7.5 1.7.1 1.9-.8l3-14.9c.2-1-.8-1.8-1.8-1.5z"/>',
    "news": '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "doc": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    "chat": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    "plus": '<path d="M12 6v12M6 12h12"/>',
}


def icon(name, cls="ic"):
    return (f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>')


def logo(cls="logo", mark_bg="#173450", mark_fg="#e0a53c", word="TENDER<span>WIN</span>"):
    return (f'<a href="#top" class="{cls}" aria-label="TenderWin — на початок сторінки">'
            f'<svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="{mark_bg}"/>'
            f'<path d="M14 20h36M32 20v26M22 44h20" stroke="{mark_fg}" stroke-width="6" stroke-linecap="round"/></svg>'
            f'<span class="logo-t">{word}</span></a>')


def nav_links(cls="nav-links"):
    return f'<nav class="{cls}" aria-label="Основні розділи">' + "".join(f'<a href="{h}">{t}</a>' for h, t in NAV) + "</nav>"


def offer_block(cls="offer-line"):
    return f'<p class="{cls}"><b>{OFFER_MAIN}</b><span class="sub">{OFFER_SUB}</span></p>'


def hero_buttons(cls="actions", primary="btn btn-primary", secondary="btn btn-secondary", arrow=True):
    a = icon("arrow") if arrow else ""
    return (f'<div class="{cls}"><a class="{primary}" href="#zayavka">{BTN_MAIN}{a}</a>'
            f'<a class="{secondary}" href="#rezultat">{BTN_SECOND}</a></div>')


def result_list(cls="checklist"):
    return f'<ul class="{cls}">' + "".join(f"<li>{icon('check')}<span>{t}</span></li>" for t in RES_LIST) + "</ul>"


def structure_doc(cls="doc"):
    """Схема висновку — декоративна (aria-hidden), з чесним підписом поруч"""
    return f'''<div class="{cls}" aria-hidden="true">
  <div class="doc-head"><b>Аналіз відхилення</b><small>Закупівля UA-…</small><em>24 години</em></div>
  <div class="doc-sec"><div class="doc-t">Підстава відхилення № 1</div>
    <div class="doc-row"><span>Що зазначив замовник</span><i style="--w:88%"></i></div>
    <div class="doc-row"><span>Вимога документації</span><u>пункт, сторінка</u></div>
    <div class="doc-row"><span>Що є у пропозиції</span><u>файл, сторінка</u></div>
    <div class="doc-row"><span>Аргументи і ризики</span><i style="--w:66%"></i></div></div>
  <div class="doc-mini"><span>Підстава № 2</span><i></i></div>
  <div class="doc-foot"><span>Наступні дії</span><b>+ консультація 30 хв</b></div>
</div>'''


def steps(cls="steps", item="step"):
    out = [f'<ol class="{cls}">']
    for i, (h, p, tag) in enumerate(STEPS, 1):
        t = f'<span class="tag">{tag}</span>' if tag else ""
        link = '<a class="step-link" href="#zayavka">До заявки</a>' if i == 1 else ""
        out.append(f'<li class="{item}"><div class="step-top"><span class="step-n">{i}</span>{t}</div><h3>{h}</h3><p>{p}</p>{link}</li>')
    out.append("</ol>")
    return "".join(out)


def faq(cls="faq"):
    out = [f'<div class="{cls}">']
    for i, (q, a) in enumerate(FAQ):
        out.append(f'<details{" open" if i == 0 else ""}><summary>{q}</summary><div class="answer">{a}</div></details>')
    out.append("</div>")
    return "".join(out)


def field(fid, label, req=True, opt="", hint="", placeholder="", typ="text", textarea=False, err=""):
    star = '<span class="req" aria-hidden="true">*</span>' if req else ""
    optl = f' <span class="opt">{opt}</span>' if opt else ""
    desc = " ".join(x for x in [f"{fid}-hint" if hint else "", f"{fid}-err"] if x)
    inv = ' aria-invalid="true"' if err else ""
    ph = f' placeholder="{placeholder}"' if placeholder else ""
    ctl = (f'<textarea id="{fid}" aria-describedby="{desc}"{ph}{inv}></textarea>' if textarea
           else f'<input id="{fid}" type="{typ}" aria-describedby="{desc}"{ph}{inv}{" required" if req else ""}>')
    h = f'<span class="hint" id="{fid}-hint">{hint}</span>' if hint else ""
    e = f'<span class="err" id="{fid}-err">{err}</span>'
    return f'<div class="field"><label for="{fid}">{label} {star}{optl}</label>{ctl}{h}{e}</div>'


def form(cls="form", state=""):
    err = FIELD_ERROR if state == "error" else ""
    msg = (f'<div class="formmsg ok" role="status" aria-live="polite">{SAVED}<span class="more">{SAVED_MORE}</span></div>' if state == "saved"
           else '<div class="formmsg" role="status" aria-live="polite"></div>')
    return f'''<form class="{cls}" action="#" onsubmit="return false" novalidate>
  <div class="row">{field("f-name", "Ім’я")}{field("f-mail", "Електронна пошта", hint="Для підтвердження заявки, рахунку й аналізу.", placeholder="name@company.ua", typ="email")}</div>
  {field("f-tender", "ID або посилання на закупівлю", hint="Формат ID: UA-РРРР-ММ-ДД-000000-a. Можна вставити посилання на закупівлю з Prozorro.", err=err)}
  {field("f-org", "Назва учасника / ПІБ ФОП", hint="Як у тендерній пропозиції.", placeholder="ТОВ «…» або ФОП Прізвище Ім’я По батькові")}
  {field("f-code", "Код ЄДРПОУ юридичної особи або РНОКПП ФОП", hint="8 цифр — код ЄДРПОУ, 10 цифр — РНОКПП (ідентифікаційний код) ФОП.")}
  <label class="check"><input type="checkbox"><span>Коду немає — уточню окремо</span></label>
  <div class="row">{field("f-lot", "Лот", req=False, opt="(якщо закупівля багатолотова)", placeholder="Наприклад, лот 2")}{field("f-contact", "Телефон або Telegram для уточнень", req=False, opt="(рекомендовано)", placeholder="+380 … або @username")}</div>
  {field("f-msg", "Коротко про ситуацію", req=False, opt="(необов’язково)", placeholder="Коли оприлюднено рішення про відхилення, чи спливає строк оскарження", textarea=True)}
  <label class="check"><input type="checkbox"><span>Рахунок оплачуватиме інша особа, ніж учасник (уточнимо дані платника до рахунку)</span></label>
  <label class="check consent"><input type="checkbox" required><span>{CONSENT}</span></label>
  <button type="submit" class="btn btn-primary btn-block">{FORM_BTN}</button>
  {msg}
  <p class="form-note">{FORM_NOTE}</p>
</form>'''


def contacts(cls="contacts", title_tag="h3"):
    lines = [
        ("phone", "Телефон", f'<a href="{PHONE_HREF}">{PHONE}</a>', ""),
        ("mail", "Пошта", f'<a href="mailto:{EMAIL}">{EMAIL}</a>', ""),
        ("tg", "Telegram", f'<a href="{TG_URL}">{TG_USER}</a>', f'<a href="{TG_URL}">Написати в Telegram</a>'),
        ("news", "Канал", f'<a href="{CH_URL}">{CH_LABEL}</a>', ""),
        ("globe", "Сайт", '<a href="https://tenderwin.in.ua/">tenderwin.in.ua</a>', ""),
    ]
    rows = "".join(f'<div class="c-line">{icon(i)}<div><span class="k">{k}</span><span class="v">{v}</span>{f"<small>{s}</small>" if s else ""}</div></div>'
                   for i, k, v, s in lines)
    return (f'<aside class="{cls}" id="kontakty"><{title_tag}>{CONT_H}</{title_tag}><p>{CONT_TEXT}</p>{rows}'
            f'<p class="executor">Виконавець — {EXECUTOR}.</p></aside>')


def posts(cls="posts"):
    return (f'<section class="{cls}" id="rozbory" aria-label="{POSTS_H}"><div class="wrap"><p class="eyebrow">{POSTS_H}</p>'
            f'<p class="posts-link"><a href="{CH_URL}">{CH_LABEL}</a></p><p class="posts-note">{POSTS_NOTE}</p></div></section>')


def footer(cls="footer", logo_html=None):
    lg = logo_html or logo()
    links = "".join(f'<a href="{h}">{t}</a>' for h, t in NAV)
    return f'''<footer class="{cls}"><div class="wrap">
  <div class="foot-top"><div class="foot-about">{lg}<p>{FOOT_1}</p><p><a href="{CH_URL}">{FOOT_2}</a></p></div>
  <nav class="foot-links" aria-label="Розділи сайту">{links}</nav></div>
  <p class="foot-privacy" id="privacy"><a href="#privacy">Політика конфіденційності та обробки персональних даних</a></p>
  <div class="foot-bottom"><span>© 2026 TenderWin · {EXECUTOR}</span>
  <span><a href="{PHONE_HREF}">{PHONE}</a> · <a href="mailto:{EMAIL}">{EMAIL}</a> · <a href="{TG_URL}">{TG_USER}</a></span></div>
</div></footer>'''


def mobilebar(cls="mobilebar"):
    return (f'<nav class="{cls}" aria-label="Замовлення"><span class="mb-text">{MOBILE_TEXT}</span>'
            f'<a class="btn btn-primary" href="#zayavka">{BTN_MAIN}</a></nav>')


def zadarma(cls="zd"):
    """Позиція віджета зворотного дзвінка Zadarma (Simple) — макет, не справжній віджет"""
    return (f'<div class="{cls}" aria-hidden="true" title="Місце віджета зворотного дзвінка Zadarma">'
            f'{icon("phone")}<span class="zd-label">віджет Zadarma</span></div>')


STATE_SCRIPT = """<script>
(function(){var s=new URLSearchParams(location.search).get('state');
 if(s==='error'||s==='saved'){document.documentElement.setAttribute('data-state',s);}
})();
</script>"""
