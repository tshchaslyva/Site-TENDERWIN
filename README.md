# TenderWin — сайт tenderwin.in.ua

Односторінковий сайт послуги «Аналіз відхилення пропозиції за 24 години».

| Що | Де |
|---|---|
| **Сайт** (саме цю папку публікує хостинг) | [`site/`](site/) — тексти в `site/index.html` |
| **Інструкція запуску й редагування** | [`docs/instrukciya-zapusku.md`](docs/instrukciya-zapusku.md) |
| **Порівняння хостингів** (Cloudflare + 5 альтернатив) | [`docs/hosting-porivnyannya.md`](docs/hosting-porivnyannya.md) |
| Попередні матеріали (архів) | `tenderwin-sayt-perehlyad.html`, `TENDERWIN_sayt_instrukciya.pdf/.docx`, `Сайт.txt` |

**Хостинг:** Cloudflare Workers зі статичним сайтом (Free), підключений до цього репозиторію.
Налаштування — у `wrangler.jsonc` (публікується папка `site`). У проєкті Cloudflare: build command порожній,
deploy command `npx wrangler deploy`, root `/`, production branch `main`. Кожна зміна в `main` публікується автоматично.

**Домени:** сайт — `tenderwin.in.ua` (DNS у Cloudflare); пошта — `vitalii@tenderwin.com.ua` (домен лишається в thehost, не чіпати).

**Форма заявки:** Web3Forms → `vitalii@tenderwin.com.ua`. Ключ вставляється в `site/index.html`
замість `ВСТАВТЕ-СЮДИ-ACCESS-KEY`. Поки ключа немає, форма відкриває поштову програму відвідувача з готовим листом.

Шрифт Fixel © MacPaw, ліцензія SIL OFL 1.1 (`site/fonts/OFL.txt`).
