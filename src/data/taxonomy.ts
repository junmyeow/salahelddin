/**
 * المفردات المضبوطة (Controlled vocabulary)
 * ------------------------------------------------------------------
 * هذا الملف هو المصدر الوحيد للحقيقة: منه تُبنى مرشّحات البحث، وشارات
 * البطاقات، والتحقّق من صحة ملف resources.json أثناء البناء.
 * أضف قيمة جديدة هنا أوّلاً، ثم استخدمها في الكتالوج.
 */

export const FORMATS = [
  { id: 'video', label: 'مرئي', icon: '▶', hint: 'أفلام ووثائقيات ومحاضرات' },
  { id: 'book', label: 'كتاب', icon: '▤', hint: 'كتب مرقمنة ومطبوعات' },
  { id: 'article', label: 'مقال', icon: '✎', hint: 'مقالات وأبحاث محكّمة' },
  { id: 'primary-source', label: 'مصدر أوّلي', icon: '❊', hint: 'نصوص معاصرة للحدث' },
  { id: 'story', label: 'قصة', icon: '❦', hint: 'سرد قصصي ومواد للناشئة' },
  { id: 'audio', label: 'صوتي', icon: '♪', hint: 'بودكاست وتسجيلات' },
  { id: 'map', label: 'خريطة', icon: '◈', hint: 'خرائط ومصوّرات تاريخية' },
] as const;

export const TOPICS = [
  { id: 'biography', label: 'السيرة الشخصية' },
  { id: 'military-campaigns', label: 'الحملات العسكرية' },
  { id: 'jerusalem', label: 'بيت المقدس' },
  { id: 'crusades', label: 'الحروب الصليبية' },
  { id: 'diplomacy', label: 'الدبلوماسية والمعاهدات' },
  { id: 'state-administration', label: 'الدولة والإدارة' },
  { id: 'architecture', label: 'العمارة والقلاع' },
  { id: 'chronicles', label: 'المؤرخون والمصادر' },
  { id: 'legacy', label: 'الإرث والذاكرة' },
] as const;

export const PLATFORMS = [
  { id: 'youtube', label: 'يوتيوب' },
  { id: 'vimeo', label: 'ڤيميو' },
  { id: 'archive-org', label: 'أرشيف الإنترنت' },
  { id: 'wikisource', label: 'ويكي مصدر' },
  { id: 'hathitrust', label: 'هاثي ترست' },
  { id: 'jstor', label: 'جيستور' },
  { id: 'shamela', label: 'المكتبة الشاملة' },
  { id: 'noor-book', label: 'نور' },
  { id: 'web', label: 'موقع إلكتروني' },
] as const;

export const SORTS = [
  { id: 'added', label: 'الأحدث إضافةً' },
  { id: 'chronological', label: 'الترتيب التاريخي' },
  { id: 'popular', label: 'الأكثر رواجاً' },
  { id: 'title', label: 'أبجدياً' },
] as const;

export type FormatId = (typeof FORMATS)[number]['id'];
export type TopicId = (typeof TOPICS)[number]['id'];
export type PlatformId = (typeof PLATFORMS)[number]['id'];
export type SortId = (typeof SORTS)[number]['id'];

export const FORMAT_IDS = FORMATS.map((f) => f.id) as unknown as [FormatId, ...FormatId[]];
export const TOPIC_IDS = TOPICS.map((t) => t.id) as unknown as [TopicId, ...TopicId[]];
export const PLATFORM_IDS = PLATFORMS.map((p) => p.id) as unknown as [PlatformId, ...PlatformId[]];

const formatMap = new Map(FORMATS.map((f) => [f.id as string, f]));
const topicMap = new Map(TOPICS.map((t) => [t.id as string, t]));
const platformMap = new Map(PLATFORMS.map((p) => [p.id as string, p]));

export const formatOf = (id: string) => formatMap.get(id);
export const topicLabel = (id: string) => topicMap.get(id)?.label ?? id;
export const platformLabel = (id: string) => platformMap.get(id)?.label ?? id;

/** ١١٨٧ بدل 1187 — الأرقام العربية الهندية */
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export const toArabicDigits = (value: string | number) =>
  String(value).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);

export const formatYear = (year: number) => `${toArabicDigits(year)}م`;

export const formatYearRange = (start: number, end: number) =>
  start === end ? formatYear(start) : `${toArabicDigits(start)}–${formatYear(end)}`;

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

/** تنسيق تاريخ ISO بصيغة عربية بدون الاعتماد على Intl (ثبات بين البيئات) */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  if (!y) return null;
  if (!m) return toArabicDigits(y);
  const month = AR_MONTHS[Number(m) - 1] ?? '';
  return d ? `${toArabicDigits(Number(d))} ${month} ${toArabicDigits(y)}` : `${month} ${toArabicDigits(y)}`;
}

export function formatDuration(minutes: number | null | undefined) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${toArabicDigits(h)} س ${toArabicDigits(m)} د`;
  if (h) return `${toArabicDigits(h)} ساعة`;
  return `${toArabicDigits(m)} دقيقة`;
}
