# TenderWin — сайт tenderwin.in.ua

Односторінковий сайт послуги «Аналіз відхилення тендерної пропозиції та 30-хвилинна консультація» (3 499 грн, аналіз за 24 години).

| Що | Де |
|---|---|
| **Сайт** (саме цю папку публікує хостинг) | [`site/`](site/) — тексти в `site/index.html` |
| **Інструкція запуску й редагування** | [`docs/instrukciya-zapusku.md`](docs/instrukciya-zapusku.md) |
| **Звіт етапу 1 (інструкція v2.0)** | [`docs/etap-1-zvit.md`](docs/etap-1-zvit.md) |
| **Звіт етапу 2 (зібрано варіант дизайну 1)** | [`docs/etap-2-zvit.md`](docs/etap-2-zvit.md) |
| **Заявки, листи, рахунки, робочий інструмент `/admin/`** | [`docs/rakhunky-nalashtuvannya.md`](docs/rakhunky-nalashtuvannya.md) |
| **П’ять варіантів дизайну** (обрано варіант 1) | [`design/README.md`](design/README.md) |
| **Порівняння хостингів** (Cloudflare + 5 альтернатив) | [`docs/hosting-porivnyannya.md`](docs/hosting-porivnyannya.md) |
| Попередні матеріали (архів) | `tenderwin-sayt-perehlyad.html`, `TENDERWIN_sayt_instrukciya.pdf/.docx`, `Сайт.txt` |

**Хостинг:** Cloudflare Workers зі статичним сайтом (Free), підключений до цього репозиторію.
Налаштування — у `wrangler.jsonc` (публікується папка `site`). У проєкті Cloudflare: build command порожній,
deploy command `npx wrangler deploy`, root `/`, production branch `main`. Кожна зміна в `main` публікується автоматично.

**Домени:** сайт — `tenderwin.in.ua` (DNS у Cloudflare); пошта — `vitalii@tenderwin.com.ua` (домен лишається в thehost, не чіпати).

**Форма заявки:** обробник `worker/` (`POST /api/zayavka`) спершу зберігає заявку в реєстрі (Durable Object), потім надсилає листи
(Resend) з повторами. Рахунок `TW-РРРР-ММ-ДД/N` створюється лише після прийняття замовлення в робочому інструменті `/admin/`.
Контакти — `contacts.json`; ціна й ліміти — `wrangler.jsonc` → `vars`; реквізити й ключі — **секрети** в Cloudflare
(`RESEND_API_KEY`, `ADMIN_TOKEN`, `SELLER_RNOKPP`, `SELLER_ADDRESS`, `SELLER_IBAN`, `SELLER_BANK`) — репозиторій публічний.
Резервний канал — Web3Forms (ключ у `site/index.html`). Тести: `npm test`, `npm run test:integration`.

Шрифт Fixel © MacPaw, ліцензія SIL OFL 1.1 (`site/fonts/OFL.txt`).
