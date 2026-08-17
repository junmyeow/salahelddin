import Fuse from 'fuse.js';

/**
 * محرّك الدليل — يعمل على البطاقات المرسومة مسبقاً في HTML.
 * الفائدة: الصفحة كاملة ومفهرسة لمحركات البحث حتى بلا جافاسكربت،
 * وما يفعله السكربت هو الإخفاء وإعادة الترتيب فقط.
 */

type IndexRow = {
  id: string;
  title: string;
  titleAlt?: string;
  creator: string;
  summary: string;
  tags: string[];
  topics: string[];
};

type Era = {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  blurb: string;
  keyEvents: { year: number; title: string }[];
};

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ar = (v: string | number) => String(v).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);

const readJSON = <T,>(id: string): T | null => {
  const el = document.getElementById(id);
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as T;
  } catch {
    return null;
  }
};

const grid = document.getElementById('grid');
const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-card]'));
if (grid && cards.length) {
  const rows = readJSON<IndexRow[]>('search-index') ?? [];
  const eras = readJSON<Era[]>('eras-data') ?? [];
  const eraById = new Map(eras.map((e) => [e.id, e]));

  const q = document.getElementById('q') as HTMLInputElement;
  const eraSelect = document.getElementById('era') as HTMLSelectElement;
  const sortSelect = document.getElementById('sort') as HTMLSelectElement;
  const resetBtn = document.getElementById('reset') as HTMLButtonElement;
  const countEl = document.getElementById('result-count');
  const emptyEl = document.getElementById('empty-state');
  const formatBoxes = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[name="format"]'),
  );
  const topicBoxes = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[name="topic"]'),
  );

  const total = cards.length;
  const byId = new Map(cards.map((c) => [c.dataset.id!, c]));

  const fuse = new Fuse(rows, {
    keys: [
      { name: 'title', weight: 3 },
      { name: 'titleAlt', weight: 2 },
      { name: 'creator', weight: 2 },
      { name: 'tags', weight: 2 },
      { name: 'topics', weight: 1.5 },
      { name: 'summary', weight: 1 },
    ],
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  // ——— الترتيب ———
  const collator = new Intl.Collator('ar');
  const sorters: Record<string, (a: HTMLElement, b: HTMLElement) => number> = {
    added: (a, b) => (b.dataset.added ?? '').localeCompare(a.dataset.added ?? ''),
    chronological: (a, b) => +a.dataset.yearStart! - +b.dataset.yearStart!,
    popular: (a, b) => +b.dataset.score! - +a.dataset.score!,
    title: (a, b) => collator.compare(a.dataset.title ?? '', b.dataset.title ?? ''),
  };

  // ——— قراءة/كتابة الحالة في العنوان ———
  function readURL() {
    const p = new URLSearchParams(location.search);
    if (p.get('q')) q.value = p.get('q')!;
    if (p.get('era')) eraSelect.value = p.get('era')!;
    if (p.get('sort')) sortSelect.value = p.get('sort')!;
    const fmts = (p.get('format') ?? '').split(',').filter(Boolean);
    const tps = (p.get('topic') ?? '').split(',').filter(Boolean);
    formatBoxes.forEach((b) => (b.checked = fmts.includes(b.value)));
    topicBoxes.forEach((b) => (b.checked = tps.includes(b.value)));
  }

  function writeURL(state: {
    q: string;
    era: string;
    sort: string;
    formats: string[];
    topics: string[];
  }) {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.era) p.set('era', state.era);
    if (state.sort !== 'added') p.set('sort', state.sort);
    if (state.formats.length) p.set('format', state.formats.join(','));
    if (state.topics.length) p.set('topic', state.topics.join(','));
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}${location.hash}` : location.pathname + location.hash);
  }

  // ——— لوحة الحقبة ———
  const detail = document.getElementById('era-detail');
  const dTitle = document.getElementById('era-detail-title');
  const dBlurb = document.getElementById('era-detail-blurb');
  const dEvents = document.getElementById('era-detail-events');

  function paintEra(eraId: string) {
    document.querySelectorAll<HTMLElement>('[data-era-btn]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.eraBtn === eraId));
    });

    const era = eraId ? eraById.get(eraId) : null;
    if (!era || !detail) {
      detail?.setAttribute('hidden', '');
      return;
    }
    detail.removeAttribute('hidden');
    if (dTitle) dTitle.textContent = `${era.label} · ${ar(era.startYear)}–${ar(era.endYear)}م`;
    if (dBlurb) dBlurb.textContent = era.blurb;
    if (dEvents) {
      dEvents.innerHTML = '';
      for (const ev of era.keyEvents) {
        const li = document.createElement('li');
        li.className =
          'rounded-lg border border-gold-500/40 bg-parchment-50/70 px-4 py-2 text-base text-ink-700 dark:border-gold-600/30 dark:bg-night-800 dark:text-parchment-300/85';
        li.textContent = `${ar(ev.year)}م — ${ev.title}`;
        dEvents.appendChild(li);
      }
    }
  }

  // ——— التطبيق ———
  function apply({ push = true } = {}) {
    const term = q.value.trim();
    const era = eraSelect.value;
    const sort = sortSelect.value;
    const formats = formatBoxes.filter((b) => b.checked).map((b) => b.value);
    const topics = topicBoxes.filter((b) => b.checked).map((b) => b.value);

    // نتائج البحث النصّي (null = لا بحث)
    let matched: Set<string> | null = null;
    let rank: Map<string, number> | null = null;
    if (term.length >= 2) {
      const hits = fuse.search(term);
      matched = new Set(hits.map((h) => h.item.id));
      rank = new Map(hits.map((h, i) => [h.item.id, i]));
    }

    const visible: HTMLElement[] = [];
    for (const card of cards) {
      const cardTopics = (card.dataset.topics ?? '').split(' ');
      const ok =
        (!matched || matched.has(card.dataset.id!)) &&
        (!era || card.dataset.era === era) &&
        (!formats.length || formats.includes(card.dataset.format!)) &&
        (!topics.length || topics.some((t) => cardTopics.includes(t)));

      card.toggleAttribute('hidden', !ok);
      if (ok) visible.push(card);
    }

    // الترتيب: صلة البحث تتقدّم على الترتيب المختار
    if (rank) {
      visible.sort((a, b) => (rank!.get(a.dataset.id!) ?? 0) - (rank!.get(b.dataset.id!) ?? 0));
    } else {
      visible.sort(sorters[sort] ?? sorters.added);
    }
    visible.forEach((card, i) => (card.style.order = String(i)));

    // الحصيلة
    if (countEl) {
      countEl.innerHTML =
        visible.length === total
          ? `عرض <strong class="font-semibold text-teal-800 dark:text-teal-300">${ar(total)}</strong> من ${ar(total)} مادة`
          : `عرض <strong class="font-semibold text-teal-800 dark:text-teal-300">${ar(visible.length)}</strong> من ${ar(total)} مادة`;
    }
    emptyEl?.toggleAttribute('hidden', visible.length > 0);

    const dirty = !!(term || era || formats.length || topics.length || sort !== 'added');
    resetBtn?.toggleAttribute('hidden', !dirty);

    paintEra(era);
    if (push) writeURL({ q: term, era, sort, formats, topics });
  }

  // ——— الأحداث ———
  let timer: number;
  q?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => apply(), 130);
  });

  [eraSelect, sortSelect].forEach((el) => el?.addEventListener('change', () => apply()));
  [...formatBoxes, ...topicBoxes].forEach((b) => b.addEventListener('change', () => apply()));

  resetBtn?.addEventListener('click', () => {
    q.value = '';
    eraSelect.value = '';
    sortSelect.value = 'added';
    [...formatBoxes, ...topicBoxes].forEach((b) => (b.checked = false));
    apply();
    document.getElementById('filters')?.scrollIntoView({ block: 'start' });
  });

  document.getElementById('era-clear')?.addEventListener('click', () => {
    eraSelect.value = '';
    apply();
    document.getElementById('timeline')?.scrollIntoView({ block: 'start' });
  });

  document.querySelectorAll<HTMLElement>('[data-era-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.eraBtn!;
      eraSelect.value = eraSelect.value === id ? '' : id;
      apply();
      document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // الحالة الابتدائية من العنوان (لدعم الروابط المشتركة)
  readURL();
  apply({ push: false });

  // بطاقات مخفية عن قارئ الشاشة أثناء الإخفاء
  byId.forEach((card) => card.setAttribute('data-ready', ''));
}
