import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';
import { FORMAT_IDS, TOPIC_IDS, PLATFORM_IDS } from './data/taxonomy';

/**
 * مخطّط البيانات — أيّ خطأ في resources.json يوقف البناء برسالة واضحة
 * بدلاً من أن يظهر كصفحة مكسورة بعد النشر.
 */
const isoDate = z
  .string()
  .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'استخدم صيغة YYYY أو YYYY-MM أو YYYY-MM-DD');

const resources = defineCollection({
  loader: file('src/content/resources.json'),
  schema: z.object({
    title: z.string().min(3),
    titleAlt: z.string().optional(),
    summary: z.string().min(20, 'اكتب ملخّصاً من سطرين على الأقل'),

    format: z.enum(FORMAT_IDS),
    language: z.array(z.enum(['ar', 'en', 'fr', 'de', 'tr', 'fa'])).min(1),

    creator: z.object({
      name: z.string(),
      role: z.string().optional(),
      url: z.string().url().optional(),
    }),
    publisher: z
      .object({ name: z.string(), url: z.string().url().optional() })
      .optional(),
    sourcePlatform: z.enum(PLATFORM_IDS),

    externalUrl: z.string().url(),
    embed: z
      .object({
        provider: z.enum(['youtube', 'vimeo', 'archive-org']),
        id: z.string(),
        startAt: z.number().int().nonnegative().default(0),
      })
      .nullable()
      .default(null),

    thumbnail: z
      .object({
        src: z.string(),
        alt: z.string(),
        credit: z.string().optional(),
      })
      .nullable()
      .default(null),

    publishedDate: isoDate.nullable().default(null),
    addedDate: isoDate,

    historical: z.object({
      startYear: z.number().int(),
      endYear: z.number().int(),
      eraId: z.string(),
    }),

    topics: z.array(z.enum(TOPIC_IDS)).min(1),
    tags: z.array(z.string()).default([]),

    rights: z
      .object({
        license: z.string().default('all-rights-reserved'),
        attributionNote: z.string().optional(),
      })
      .default({ license: 'all-rights-reserved' }),

    duration: z.number().int().positive().nullable().default(null),
    pageCount: z.number().int().positive().nullable().default(null),

    curatorScore: z.number().int().min(0).max(100).default(50),
    featured: z.boolean().default(false),
    status: z.enum(['live', 'broken', 'pending-review']).default('live'),
    lastChecked: isoDate.nullable().default(null),
  }),
});

const eras = defineCollection({
  loader: file('src/content/eras.json'),
  schema: z.object({
    label: z.string(),
    startYear: z.number().int(),
    endYear: z.number().int(),
    order: z.number().int(),
    blurb: z.string(),
    keyEvents: z
      .array(z.object({ year: z.number().int(), title: z.string() }))
      .default([]),
  }),
});

export const collections = { resources, eras };
