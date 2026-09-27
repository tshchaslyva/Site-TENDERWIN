# TenderWin — сайт tenderwin.in.ua

Односторінковий сайт послуги «Аналіз відхилення пропозиції за 24 години».

| Що | Де |
|---|---|
| **Сайт** (саме цю папку публікує хостинг) | [`site/`](site/) — тексти в `site/index.html` |
| **Інструкція запуску й редагування** | [`docs/instrukciya-zapusku.md`](docs/instrukciya-zapusku.md) |
| **Автоматичні листи з рахунком: налаштування** | [`docs/rakhunky-nalashtuvannya.md`](docs/rakhunky-nalashtuvannya.md) |
| **Порівняння хостингів** (Cloudflare + 5 альтернатив) | [`docs/hosting-porivnyannya.md`](docs/hosting-porivnyannya.md) |
| Попередні матеріали (архів) | `tenderwin-sayt-perehlyad.html`, `TENDERWIN_sayt_instrukciya.pdf/.docx`, `Сайт.txt` |

**Хостинг:** Cloudflare Workers зі статичним сайтом (Free), підключений до цього репозиторію.
Налаштування — у `wrangler.jsonc` (публікується папка `site`). У проєкті Cloudflare: build command порожній,
deploy command `npx wrangler deploy`, root `/`, production branch `main`. Кожна зміна в `main` публікується автоматично.

**Домени:** сайт — `tenderwin.in.ua` (DNS у Cloudflare); пошта — `vitalii@tenderwin.com.ua` (домен лишається в thehost, не чіпати).

**Форма заявки:** обробник `worker/` (`POST /api/zayavka`) — лист Віталію + лист клієнту з PDF-рахунком
`TW-РРРР-ММ-ДД/N` (пошта — Resend, назва клієнта — Clarity Project, нумерація — Durable Object).
Реквізити й ціна — у `wrangler.jsonc` → `vars`; ключі — секрети `RESEND_API_KEY`, `CLARITY_API_KEY` у Cloudflare.
Якщо обробник недоступний — запасний канал Web3Forms (ключ у `site/index.html`). Тести: `npm test`.

Шрифт Fixel © MacPaw, ліцензія SIL OFL 1.1 (`site/fonts/OFL.txt`).
