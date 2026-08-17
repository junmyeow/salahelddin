/**
 * فاحص الروابط — يشغَّل بـ:  npm run check:links
 *
 * يطلب كل externalUrl في الكتالوج ويطبع تقريراً. لا يعدّل الملفات؛
 * القرار لك: أصلح الرابط، أو غيّر الحالة إلى "broken"، أو احذف الإدراج.
 *
 * يُستحسن تشغيله شهرياً — تعفّن الروابط هو ما يقتل أدلّة الروابط.
 */
import { readFile } from 'node:fs/promises';

const FILE = new URL('../src/content/resources.json', import.meta.url);
const TIMEOUT = 15000;
const CONCURRENCY = 6;

const c = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  bad: (s) => `\x1b[31m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    // بعض الخوادم ترفض HEAD — نجرّبها أولاً ثم نسقط إلى GET
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
    }
    return { status: res.status, finalUrl: res.url };
  } catch (err) {
    return { status: 0, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

const items = JSON.parse(await readFile(FILE, 'utf8'));
console.log(`\nفحص ${items.length} رابطاً…\n`);

const results = [];
for (let i = 0; i < items.length; i += CONCURRENCY) {
  const batch = items.slice(i, i + CONCURRENCY);
  const settled = await Promise.all(
    batch.map(async (item) => ({ item, ...(await probe(item.externalUrl)) })),
  );
  for (const r of settled) {
    const ok = r.status >= 200 && r.status < 400;
    const tag = ok ? c.ok('✓ ' + r.status) : c.bad('✗ ' + (r.status || r.error));
    console.log(`${tag}  ${r.item.id}`);
    if (!ok) console.log(`      ${c.dim(r.item.externalUrl)}`);
    else if (r.finalUrl && r.finalUrl !== r.item.externalUrl) {
      console.log(`      ${c.warn('→ تحويل:')} ${c.dim(r.finalUrl)}`);
    }
    results.push({ ...r, ok });
  }
}

const broken = results.filter((r) => !r.ok);
console.log(
  `\n${c.ok(`${results.length - broken.length} سليم`)} · ` +
    `${broken.length ? c.bad(`${broken.length} معطّل`) : c.dim('لا أعطال')}\n`,
);

if (broken.length) {
  console.log('عدّل هذه المُدخلات في src/content/resources.json:');
  for (const b of broken) console.log(`  - ${b.item.id}  (${b.status || b.error})`);
  console.log('');
  process.exitCode = 1;
}
