# -*- coding: utf-8 -*-
"""
Концепція «Розвиток»: беремо чинну сторінку site/index.html (дизайн «Еволюція») і вносимо лише структурні зміни
інструкції v3.0 та відповідні дані. Результат — шаблон design3/src/rozvytok.html (далі його збирає build.py).
Запуск із кореня репозиторію: python3 design3/make_rozvytok.py && python3 design3/build.py
Робочий сайт (site/) не змінюється.
"""
import os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
s = open(os.path.join(ROOT, "site", "index.html"), encoding="utf-8").read()


def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:80], s.count(a))
    s = s.replace(a, b)


# ---------- службове: прототип (noindex, без робочої форми й статистики) ----------
rep("Тексти сайту — нижче, між <body> і </body>. Цей блок змінювати не потрібно.",
    "Прототип «Розвиток»: дизайн чинного сайту без змін + структурні зміни інструкції v3.0 і жвавіший рух.")
head_start = s.index("<head>") + len("<head>")
s = s[:head_start] + "\n{{HEAD}}\n" + s[s.index("<style>"):]
rep("<style>", "<style>\n{{VIEWER_CSS}}\n{{PROTO_CSS}}")
rep("</head>\n<body>", '</head>\n<body>\n{{PROTO}}\n<div class="progress" aria-hidden="true"></div>')

# ---------- навігація (v3 8.1) ----------
rep('''      <a href="#rezultat">Що входить</a>
      <a href="#yak">Як замовити</a>
      <a href="#vartist">Вартість</a>
      <a href="#pytannya">Питання</a>
      <a href="#kontakty">Контакти</a>''', '''      <a href="#rezultat">Результат</a>
      <a href="#zrazok">Приклад звіту</a>
      <a href="#yak">Як замовити</a>
      <a href="#vartist">Вартість</a>
      <a href="#kontakty">Контакти</a>''')

# ---------- перший екран (v3 8.2): другорядна кнопка ----------
rep('<a class="btn btn-ghost btn-lg" href="#rezultat">Що входить у послугу</a>',
    '<a class="btn btn-ghost btn-lg" href="#zrazok">Переглянути зразок аналізу</a>')
rep("<h1>Аналіз відхилення тендерної пропозиції за&nbsp;24&nbsp;години</h1>",
    '<h1>Аналіз відхилення тендерної пропозиції <span class="mark">за&nbsp;24&nbsp;години</span></h1>')

# ---------- новий розділ «Приклад звіту» (v3 7) ----------
rep("<!-- ============ 3. ЯК ЗАМОВИТИ ============ -->", '''<!-- ============ ПРИКЛАД ЗВІТУ (інструкція v3.0, розділ 7) ============ -->
<section id="zrazok" class="sample">
  <div class="wrap">
    <div class="sec-head" data-reveal>
      <p class="eyebrow"><b>02</b>Приклад звіту</p>
      <h2>Переглянути зразок аналізу</h2>
      <p class="lede">Документ у тому вигляді, який отримує клієнт. Оберіть, що показати: підставу, документи, ризики чи рекомендацію. Підсвічування накладає лише переглядач — документ не змінюється.</p>
    </div>
    <div class="sample-grid">
      <div class="legend" role="group" aria-label="Що подивитися у звіті">
        <button type="button" class="it chip-pidstava" data-key="pidstava" aria-pressed="false"><i aria-hidden="true"></i><span><b>Підстава</b>Дослівне формулювання замовника, з якого починається розбір.</span></button>
        <button type="button" class="it chip-dokument" data-key="dokument" aria-pressed="false"><i aria-hidden="true"></i><span><b>Документ</b>Вимога документації й те, що є у Вашій пропозиції, — з номером сторінки.</span></button>
        <button type="button" class="it chip-ryzyk" data-key="ryzyk" aria-pressed="false"><i aria-hidden="true"></i><span><b>Ризик</b>Що може послабити позицію або вплинути на рішення.</span></button>
        <button type="button" class="it chip-rekomendatsiia" data-key="rekomendatsiia" aria-pressed="false"><i aria-hidden="true"></i><span><b>Рекомендація</b>Що робити далі й чому — оскаржувати чи ні.</span></button>
        <div class="facts" id="facts">
          <div><b data-n="{{DOC_PAGES}}">{{DOC_PAGES}}</b><span>сторінок у прикладі</span></div>
          <div><b data-n="{{DOC_SECTIONS}}">{{DOC_SECTIONS}}</b><span>розділів у змісті</span></div>
        </div>
        <p class="legend-note">Повний PDF можна відкрити або завантажити без реєстрації.</p>
      </div>
      <div class="viewer-card">
        <div id="sample" data-viewer data-doc="first" data-mode="page" data-thumbs="true">{{RVFALLBACK:first}}</div>
      </div>
    </div>
  </div>
</section>

<!-- ============ 3. ЯК ЗАМОВИТИ ============ -->''')
rep('<p class="eyebrow"><b>01</b>Що Ви отримаєте</p>', '<p class="eyebrow"><b>01</b>Результат</p>')
rep('<p class="eyebrow"><b>02</b>Як замовити</p>', '<p class="eyebrow"><b>03</b>Як замовити</p>')
rep('<p class="eyebrow" data-reveal><b>03</b>Вартість послуги</p>', '<p class="eyebrow" data-reveal><b>04</b>Вартість послуги</p>')
rep('<p class="eyebrow"><b>04</b>Питання</p>', '<p class="eyebrow"><b>05</b>Питання</p>')
rep('<p class="eyebrow"><b>05</b>Заявка</p>', '<p class="eyebrow"><b>06</b>Заявка</p>')

# ---------- крок 2: поки немає IBAN (v3 8.4) ----------
rep('''        <p>Перевіримо вихідні дані й можливість виконати аналіз вчасно, погодимо умови та надішлемо рахунок на 3&nbsp;499&nbsp;грн.</p>
      </li>''', '''        <p>Перевіримо вихідні дані й можливість виконати аналіз вчасно, погодимо умови та надішлемо рахунок на 3&nbsp;499&nbsp;грн.</p>
        <p class="step-note">Платіжні реквізити надамо додатково. До їх отримання оплату за цим рахунком здійснити неможливо.</p>
      </li>''')

# ---------- вартість: формулювання про документообіг — лише після підтвердження (v3 13.4) ----------
rep('''    <p class="fine" data-reveal><b>Працюємо за договором. Надаємо рахунок і акт наданих послуг.</b>
      Працюємо дистанційно з учасниками закупівель по всій Україні.</p>''',
    '''    <p class="fine" data-reveal>Працюємо дистанційно з учасниками закупівель по всій Україні.</p>''')

# ---------- форма: прототип нічого не надсилає ----------
s = re.sub(r'<form id="leadform"[^>]*>', '<form id="leadform" novalidate aria-label="Заявка на аналіз (демонстрація)">', s, count=1)
s = re.sub(r'\s*<input type="hidden" name="access_key"[^>]*>\s*<input type="hidden" name="subject"[^>]*>\s*'
           r'<input type="hidden" name="from_name"[^>]*>\s*<input type="checkbox" name="botcheck"[^>]*>', "", s, count=1)
s = re.sub(r"\s*<noscript><p class=\"form-note\">У Вашому браузері вимкнено JavaScript.*?</noscript>", "", s, count=1, flags=re.S)
s = re.sub(r"<!-- Основний канал — обробник /api/zayavka.*?-->",
           "<!-- Прототип: форма нічого не надсилає — показує стани «помилка / надсилання / збережено / лист затримався». -->", s, count=1, flags=re.S)
rep('''          <p class="form-note">Надсилання заявки не є оплатою.''', '''          <div class="demo-states" aria-label="Демонстрація станів форми"><p>Прототип: показати стан форми</p><div>
            <button type="button" data-state="error">Помилка в полях</button><button type="button" data-state="sending">Надсилання</button>
            <button type="button" data-state="saved">Збережено</button><button type="button" data-state="delayed">Лист затримався</button><button type="button" data-state="">Скинути</button></div></div>
          <p class="form-note">Надсилання заявки не є оплатою.''')

# ---------- контакти (v3 8.7) ----------
rep('''        <p>Зателефонуйте за номером <span class="nowrap">+380&nbsp;800&nbsp;357&nbsp;135</span> або напишіть нам''',
    '''        <p>Зателефонуйте за номером <span class="nowrap">+380&nbsp;800&nbsp;357&nbsp;135</span>, замовте зворотний дзвінок або напишіть нам''')
rep('''        <div class="contact-line">
          <span class="ci" aria-hidden="true"><svg><use href="#i-mail"/></svg></span>''', '''        <div class="contact-line">
          <span class="ci" aria-hidden="true"><svg><use href="#i-phone"/></svg></span>
          <div><span class="k">Зворотний дзвінок</span>
            <span class="v"><a href="#cb" data-callback>Замовити дзвінок</a></span>
            <small>Віджет Zadarma підключимо після отримання налаштувань</small></div>
        </div>
        <div class="contact-line">
          <span class="ci" aria-hidden="true"><svg><use href="#i-mail"/></svg></span>''')

# ---------- футер ----------
rep('''        <a href="#rezultat">Що входить</a>''', '''        <a href="#rezultat">Результат</a>
        <a href="#zrazok">Приклад звіту</a>''')

# ---------- скрипти: без робочого app.js (статистика, відправлення), без коментаря віджета й JSON-LD ----------
s = re.sub(r'<script src="app.js" defer></script>\s*', "", s, count=1)
s = re.sub(r"<!-- ZADARMA:.*?-->\s*", "", s, count=1, flags=re.S)
s = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', "", s, count=1, flags=re.S)
rep("</body>", """{{CALLBACK}}
<script>window.TW_REPORTS = {{REPORTS_JSON}};</script>
<script>{{VIEWER_JS}}</script>
<script>{{ROZVYTOK_JS}}</script>
</body>""")
# ---------- оформлення нових частин і рух — окремим блоком у кінці стилів ----------
rep("</style>", "{{ROZVYTOK_CSS}}\n</style>")

open(os.path.join(ROOT, "design3", "src", "rozvytok.html"), "w", encoding="utf-8").write(s)
print("готово: design3/src/rozvytok.html")
