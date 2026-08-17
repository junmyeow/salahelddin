/**
 * اختيار اليوم — انتقاء حتمي بلا خادم.
 * ------------------------------------------------------------------
 * الموقع ثابت (static)، فلا توجد جهة تقرّر «مادة اليوم». الحلّ أن يكون
 * الانتقاء دالةً في التاريخ نفسه: كل زائر في اليوم نفسه يرى المادة نفسها،
 * ويتغيّر الاختيار عند منتصف ليل الزائر — بلا قاعدة بيانات ولا إعادة بناء.
 *
 * الخاصيّة المهمّة: كل مادة تظهر مرّة واحدة بالضبط في كل دورة طولها n يوماً
 * (n = عدد المواد)، ثم يُعاد خلط الترتيب في الدورة التالية. فلا تكرار قريب
 * ولا مادة تُنسى.
 */

/** رقم اليوم التقويمي المحلي — يتغيّر عند منتصف ليل الزائر لا عند منتصف ليل UTC */
export function dayNumber(d: Date = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/** مولّد أعداد شبه عشوائية حتمي (mulberry32) — نفس البذرة ⇒ نفس المتتالية */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** خلط فيشر–ييتس ببذرة ثابتة */
function seededOrder(n: number, seed: number): number[] {
  const rnd = mulberry32(seed);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * ترتيب دورة معيّنة، بعد معالجة حالة الحدّ:
 * لو صادف أن أوّل عنصر في الدورة الجديدة هو نفسه آخر عنصر في السابقة،
 * لظهرت المادة يومين متتاليين — فنبدّل أوّل عنصرين.
 * (نظرة واحدة إلى الخلف تكفي: تبديل أوّل عنصرين لا يغيّر آخر عنصر.)
 */
function orderForCycle(n: number, cycle: number): number[] {
  const order = seededOrder(n, cycle + 1);
  if (n < 3) return order;
  const prev = seededOrder(n, cycle);
  if (order[0] === prev[n - 1]) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

/**
 * فهرس مادة اليوم داخل مصفوفة من n عنصراً.
 * ضمانان: كل مادة تظهر مرّة واحدة في كل دورة طولها n يوماً،
 * ولا تتكرّر مادة في يومين متتاليين أبداً.
 */
export function pickIndexForDay(n: number, day: number = dayNumber()): number {
  if (n <= 0) return -1;
  if (n === 1) return 0;
  // بمادّتين لا يبقى إلا التناوب الصريح — وإلا أمكن أن تتكرّر إحداهما على الحدّ
  if (n === 2) return ((day % 2) + 2) % 2;
  const cycle = Math.floor(day / n);
  const pos = ((day % n) + n) % n;
  return orderForCycle(n, cycle)[pos];
}

/** الثواني المتبقية حتى منتصف الليل المحلي — لتحديث اللوحة دون إعادة تحميل */
export function secondsUntilLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
  return Math.max(1, Math.round((next.getTime() - now.getTime()) / 1000));
}
