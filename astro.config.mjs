// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// ⚠️ خطوة النشر — قبل الرفع، اضبط `site` (و`base` إن كان الموقع على
// github.io/<repo>). القيم الحالية كافية للتطوير المحلي.
export default defineConfig({
  site: 'https://junmyeow.github.io',
  base: '/salahelddin', // اسم المستودع — يجب أن يطابقه حرفاً بحرف
  trailingSlash: 'ignore',
  vite: {
    plugins: [tailwindcss()],
  },
});
