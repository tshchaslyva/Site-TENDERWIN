// Скриншоти п'яти варіантів дизайну (розділ 20.3 інструкції v2.0).
// Запуск із кореня репозиторію: python3 -m http.server 8800 &  потім  node design/shots.cjs [DPR]
// Потрібен Playwright (NODE_PATH до глобальних модулів або npm i playwright).
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.DESIGN_BASE || 'http://127.0.0.1:8800/design/';
const DPR = Number(process.argv[2] || 2);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : [1, 2, 3, 4, 5];

let browser;

/** Знімки екранів під час прокрутки, склеєні в одне зображення (для закріплених елементів) */
async function stitched(file, url, vw, vh) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const frames = [];
  for (let y = 0; y < total; y += vh) {
    const sy = Math.min(y, total - vh);
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), sy);
    await page.waitForTimeout(120);
    frames.push({ y, sy, data: (await page.screenshot()).toString('base64') });
  }
  const png = await page.evaluate(async ({ frames, vw, vh, total }) => {
    const c = document.createElement('canvas'); c.width = vw; c.height = total;
    const g = c.getContext('2d');
    for (const f of frames) {
      const img = new Image(); img.src = 'data:image/png;base64,' + f.data; await img.decode();
      const skip = f.y - f.sy;                       // перекриття останнього кадру
      g.drawImage(img, 0, skip, vw, vh - skip, 0, f.y, vw, vh - skip);
    }
    return c.toDataURL('image/png').split(',')[1];
  }, { frames, vw, vh, total });
  require('fs').writeFileSync(file, Buffer.from(png, 'base64'));
  await ctx.close();
}

(async () => {
  browser = await chromium.launch();
  for (const n of ONLY) {
    const dir = path.join(__dirname, `variant-${n}`);
    const shot = async (file, vw, vh, opts = {}) => {
      const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: opts.dpr || DPR });
      const page = await ctx.newPage();
      await page.goto(BASE + `variant-${n}/` + (opts.page || 'index.html'), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // для знімків окремих елементів прибираємо закріплені шапку, панель і віджет, щоб вони не перекривали форму
      if (opts.selector) await page.addStyleTag({ content: '.top,.rail{position:static !important}.zd,.mobilebar{display:none !important}' });
      if (opts.selector) await page.locator(opts.selector).first().screenshot({ path: path.join(dir, file) });
      else await page.screenshot({ path: path.join(dir, file), fullPage: !!opts.full });
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      await ctx.close();
      return sw;
    };
    // у варіанті 4 ліва панель закріплена: склеюємо екрани прокрутки, щоб вона була видна на всій висоті
    if (n === 4) await stitched(path.join(dir, `variant-${n}-desktop.png`), BASE + `variant-${n}/index.html`, 1440, 900);
    else await shot(`variant-${n}-desktop.png`, 1440, 900, { full: true, dpr: 1 });
    await shot(`variant-${n}-mobile.png`, 390, 844, { full: true, dpr: DPR });
    await shot(`variant-${n}-hero-desktop.png`, 1440, 900, { dpr: DPR });
    await shot(`variant-${n}-hero-mobile.png`, 390, 844, { dpr: DPR });
    await shot(`variant-${n}-state-error.png`, 1440, 900, { page: 'state-error.html', selector: 'form', dpr: 1 });
    await shot(`variant-${n}-state-saved.png`, 1440, 900, { page: 'state-saved.html', selector: 'form', dpr: 1 });
    await shot(`variant-${n}-faq-open.png`, 1440, 900, { selector: '.faq details[open]', dpr: 1 });
    const sw = await shot(`_check-320.png`, 320, 700, { dpr: 1 });
    console.log(`variant-${n}: ширина документа на 320 px = ${sw}`);
    require('fs').unlinkSync(path.join(dir, '_check-320.png'));
  }
  await browser.close();
})();
