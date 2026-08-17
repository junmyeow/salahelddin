/**
 * يبني الروابط الداخلية مع مراعاة `base` في إعدادات Astro،
 * حتى يعمل الموقع على github.io/<repo> دون تعديل كل رابط يدوياً.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const clean = path.replace(/^\/+/, '');
  const joined = `${base}/${clean}`.replace(/\/+$/, '');
  return joined === '' ? '/' : joined;
}
