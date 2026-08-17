/**
 * لقطات شاشة عبر Puppeteer.
 *
 *   node screenshot.mjs http://localhost:3000
 *   node screenshot.mjs http://localhost:3000 hero          ← لاحقة اسمية
 *   node screenshot.mjs http://localhost:3000 dark --dark   ← الوضع الداكن
 *   node screenshot.mjs http://localhost:3000 phone --w=390 --h=844
 *
 * تُحفظ في «temporary screenshots/screenshot-N[-label].png» بترقيم تلقائي
 * لا يستبدل ملفاً قائماً.
 */
import puppeteer from 'puppeteer';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http')) ?? 'http://localhost:3000';
const label = args.find((a) => !a.startsWith('http') && !a.startsWith('--'));
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};

const width = flag('w', 1440);
const height = flag('h', 900);
const dark = args.includes('--dark');
const fullPage = !args.includes('--viewport');

const OUT = 'temporary screenshots';
await mkdir(OUT, { recursive: true });

// ترقيم تلقائي: لا نكتب فوق لقطة سابقة أبداً
const existing = await readdir(OUT).catch(() => []);
const next =
  existing
    .map((f) => Number(/^screenshot-(\d+)/.exec(f)?.[1] ?? 0))
    .reduce((a, b) => Math.max(a, b), 0) + 1;
const name = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const path = join(OUT, name);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--font-render-hinting=none', '--lang=ar'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' },
  ]);

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

  // انتظر تحميل الخطوط العربية قبل اللقطة — وإلا صوّرنا خطّ احتياطي
  await page.evaluate(() => document.fonts.ready);

  const scroll = flag('scroll', 0);
  if (scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), scroll);
    await new Promise((r) => setTimeout(r, 300));
  }
  await new Promise((r) => setTimeout(r, 400));

  await page.screenshot({ path, fullPage });

  const dims = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight,
  }));

  console.log(`saved  ${path}`);
  console.log(`page   ${dims.w} x ${dims.h}   viewport ${width}x${height}${dark ? '  [dark]' : ''}`);
  if (dims.w > width) console.log(`⚠ تمرير أفقي: المحتوى أعرض من النافذة بـ ${dims.w - width}px`);
  if (errors.length) {
    console.log(`⚠ ${errors.length} خطأ في وحدة التحكّم:`);
    for (const e of errors.slice(0, 8)) console.log(`   ${e}`);
  }
} finally {
  await browser.close();
}
