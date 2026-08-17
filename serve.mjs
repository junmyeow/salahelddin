/**
 * خادم ثابت بسيط للقطات الشاشة — http://localhost:3000
 *
 * يخدم مجلّد dist/ (ناتج `npm run build`)، لا جذر المشروع، لأن هذا
 * مشروع Astro يحتاج بناءً قبل العرض. شغّله هكذا:
 *
 *     npm run build && node serve.mjs
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const ROOT = new URL('./dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PORT = Number(process.env.PORT ?? 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

async function resolve(urlPath) {
  // منع الخروج من مجلّد dist
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, clean);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    return file;
  } catch {
    // مسار بلا امتداد ⇒ جرّب index.html داخله
    if (!extname(file)) {
      const candidate = join(file, 'index.html');
      try {
        await stat(candidate);
        return candidate;
      } catch {}
    }
    return null;
  }
}

createServer(async (req, res) => {
  const file = await resolve(req.url ?? '/');
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
  }
}).listen(PORT, () => {
  console.log(`serving dist/ at http://localhost:${PORT}`);
});
