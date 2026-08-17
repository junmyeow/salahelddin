/**
 * التحقّق من روابط يوتيوب قبل إدراجها — بلا مفتاح API.
 *
 *   node scripts/check-youtube.mjs "<رابط>" "<رابط>" ...
 *
 * نقطة oEmbed العامّة تُجيب ٢٠٠ فقط إذا كان المقطع موجوداً **و** يسمح
 * بالتضمين. أمّا المحذوف أو الخاص أو الممنوع من التضمين فيُعيد ٤٠١/٤٠٤.
 * هذا بالضبط ما نحتاجه: لا يُدرَج في الأرشيف إلا ما يعمل فعلاً داخل الصفحة.
 *
 * يطبع كائن JSON جاهزاً للّصق في src/content/resources.json.
 */

import { pathToFileURL } from 'node:url';

/** يستخرج معرّف المقطع من أيّ صيغة رابط يوتيوب شائعة */
export function youtubeId(input) {
  const s = String(input).trim();
  if (/^[\w-]{11}$/.test(s)) return s; // معرّف مجرّد
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return null;
  if (u.searchParams.get('v')) return u.searchParams.get('v');
  const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{11})/);
  return m ? m[2] : null;
}

/** يستخرج معرّف قائمة التشغيل إن كان الرابط قائمةً لا مقطعاً */
export function playlistId(input) {
  const s = String(input).trim();
  if (/^PL[\w-]{10,}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(u.hostname.replace(/^www\.|^m\./, '')))
      return null;
    const list = u.searchParams.get('list');
    // روابط المقاطع تحمل list أيضاً — لا نعدّها قائمة إلا إن لم يكن فيها v
    return list && !u.searchParams.get('v') ? list : null;
  } catch {
    return null;
  }
}

export async function probeYouTube(input) {
  const list = playlistId(input);
  if (list) {
    const u = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/playlist?list=${list}`,
    )}&format=json`;
    try {
      const res = await fetch(u);
      if (!res.ok)
        return { input, id: list, kind: 'playlist', ok: false, reason: `قائمة غير متاحة (${res.status})` };
      const d = await res.json();
      return {
        input,
        id: list,
        kind: 'playlist',
        ok: true,
        title: d.title,
        channel: d.author_name,
        channelUrl: d.author_url?.startsWith('http')
          ? d.author_url
          : `https://www.youtube.com${d.author_url ?? ''}`,
        thumb: d.thumbnail_url,
      };
    } catch (e) {
      return { input, id: list, kind: 'playlist', ok: false, reason: `فشل الاتصال: ${e.message}` };
    }
  }

  const id = youtubeId(input);
  if (!id) return { input, ok: false, reason: 'تعذّر استخراج المعرّف من الرابط' };

  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${id}`,
  )}&format=json`;

  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (res.status === 401 || res.status === 403) {
      return { input, id, ok: false, reason: 'موجود لكنّ التضمين ممنوع — لا يصلح للإدراج' };
    }
    // يوتيوب يُعيد ٤٠٠ لمعرّف غير صالح و٤٠٤ للمحذوف
    if (res.status === 400 || res.status === 404) {
      return { input, id, ok: false, reason: 'غير موجود أو محذوف أو خاص' };
    }
    if (!res.ok) return { input, id, ok: false, reason: `استجابة غير متوقّعة ${res.status}` };

    const d = await res.json();
    return {
      input,
      id,
      kind: 'video',
      ok: true,
      title: d.title,
      channel: d.author_name,
      channelUrl: d.author_url,
      thumb: d.thumbnail_url,
    };
  } catch (e) {
    return { input, id, ok: false, reason: `فشل الاتصال: ${e.message}` };
  }
}

// ——— التشغيل من سطر الأوامر ———
// pathToFileURL يضبط صيغة مسارات ويندوز (file:///C:/…) بخلاف التركيب اليدوي
const isCli = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isCli) {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log('الاستعمال: node scripts/check-youtube.mjs "<رابط يوتيوب>" ...');
    process.exit(0);
  }

  let bad = 0;
  for (const a of args) {
    const r = await probeYouTube(a);
    if (!r.ok) {
      bad++;
      console.log(`\n\x1b[31m✗\x1b[0m ${a}\n   ${r.reason}`);
      continue;
    }
    const isList = r.kind === 'playlist';
    console.log(`\n\x1b[32m✓\x1b[0m ${r.title}   ${isList ? '\x1b[33m[قائمة تشغيل]\x1b[0m' : ''}`);
    console.log(`   القناة : ${r.channel}`);
    console.log(`   المعرّف: ${r.id}`);
    console.log(`   مقتطف جاهز للكتالوج:`);
    console.log(
      JSON.stringify(
        {
          externalUrl: isList
            ? `https://www.youtube.com/playlist?list=${r.id}`
            : `https://www.youtube.com/watch?v=${r.id}`,
          embed: { provider: isList ? 'youtube-playlist' : 'youtube', id: r.id, startAt: 0 },
          ...(isList && r.thumb ? { thumbnail: { src: r.thumb, alt: r.title } } : {}),
          creator: { name: r.channel, role: 'قناة', url: r.channelUrl },
          publisher: { name: 'يوتيوب', url: 'https://youtube.com' },
          sourcePlatform: 'youtube',
          rights: { license: 'standard-youtube' },
        },
        null,
        2,
      )
        .split('\n')
        .map((l) => '   ' + l)
        .join('\n'),
    );
  }
  console.log(`\n${args.length - bad} صالح · ${bad} غير صالح\n`);
  if (bad) process.exitCode = 1;
}
