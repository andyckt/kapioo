const TORONTO_TZ = 'America/Toronto';

const EN_MONTH_TO_NUM: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const EN_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function formatYmd(y: number, m: number, d: number, language: string): string {
  if (language === 'zh') return `${y}年${m}月${d}日`;
  return `${EN_MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

/** Short weekday labels aligned with 2026年5月5日（周二） / May 5, 2026 (Tuesday). */
const ZH_WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;
const EN_WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function weekdayLabelForGregorianYmd(y: number, m: number, d: number, language: string): string {
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dow = utc.getUTCDay();
  if (language === 'zh') return ZH_WEEKDAY_SHORT[dow];
  return EN_WEEKDAY_LONG[dow];
}

/** Resolves a stored delivery date string to a calendar day when possible. */
function parseOrderHistoryDeliveryYmd(raw: string): { y: number; m: number; d: number } | null {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s || s === 'Unknown Date') return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    const y = Number(iso[1]);
    const mo = Number(iso[2]);
    const d = Number(iso[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return { y, m: mo, d };
    }
  }

  const mdEnglish = parseEnglishMonthDayYear(s);
  if (mdEnglish) {
    return { y: mdEnglish.y, m: mdEnglish.m, d: mdEnglish.d };
  }

  const fromDate = new Date(s);
  if (!Number.isNaN(fromDate.getTime())) {
    const ymd = ymdFromDateInToronto(fromDate);
    if (ymd) return ymd;
  }

  return null;
}

function parseEnglishMonthDayYear(s: string): { y: number; m: number; d: number } | null {
  const re = /^([a-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/i;
  const match = re.exec(s.trim());
  if (!match) return null;
  const monKey = match[1].toLowerCase();
  const m = EN_MONTH_TO_NUM[monKey];
  if (!m) return null;
  const d = Number(match[2]);
  const y = match[3] ? Number(match[3]) : new Date().getFullYear();
  if (!Number.isFinite(d) || d < 1 || d > 31 || !Number.isFinite(y)) return null;
  return { y, m, d };
}

function ymdFromDateInToronto(date: Date): { y: number; m: number; d: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: TORONTO_TZ,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value])) as {
      year?: string;
      month?: string;
      day?: string;
    };
    const y = Number(parts.year);
    const m = Number(parts.month);
    const d = Number(parts.day);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    return { y, m, d };
  } catch {
    return null;
  }
}

/**
 * Formats a stored line-item delivery date for user order history.
 * Supports ISO `yyyy-MM-dd`, English month-day (optional year), and other values `Date` can parse.
 * Chinese: 2026年5月5日 — English: May 5, 2026
 */
export function formatOrderHistoryDeliveryDate(raw: string, language: string): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return '—';
  if (s === 'Unknown Date') {
    return language === 'zh' ? '未知日期' : 'Unknown date';
  }

  const ymd = parseOrderHistoryDeliveryYmd(s);
  if (ymd) return formatYmd(ymd.y, ymd.m, ymd.d, language);

  return s;
}

/** Same as {@link formatOrderHistoryDeliveryDate} plus weekday: 2026年5月5日（周二） / May 5, 2026 (Tuesday) */
export function formatOrderHistoryDeliveryDateWithWeekday(raw: string, language: string): string {
  const base = formatOrderHistoryDeliveryDate(raw, language);
  if (base === '—' || base === '未知日期' || base === 'Unknown date') return base;

  const ymd = parseOrderHistoryDeliveryYmd(typeof raw === 'string' ? raw.trim() : '');
  if (!ymd) return base;

  const w = weekdayLabelForGregorianYmd(ymd.y, ymd.m, ymd.d, language);
  if (language === 'zh') return `${base}（${w}）`;
  return `${base} (${w})`;
}

/** Standard windows shown on the marketing site / how-it-works for user order history. */
export function getStandardDeliveryWindow(service: 'daily' | 'weekly', language: string): string {
  const isZh = language === 'zh';
  if (service === 'daily') {
    return isZh ? '11:00–13:00' : '11am – 1pm';
  }
  return isZh ? '18:00–22:00' : '6pm – 10pm';
}

export function uniqueDeliveryDatesFromOrderItems(
  items: Array<{ date?: string }> | undefined | null
): string[] {
  if (!items?.length) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const raw = typeof item.date === 'string' ? item.date.trim() : '';
    if (raw && !seen.has(raw)) {
      seen.add(raw);
      result.push(raw);
    }
  }
  return result;
}

export function formatDeliveryDatesList(dates: string[], language: string): string {
  if (!dates.length) return '—';
  const sep = language === 'zh' ? '、' : ', ';
  return dates.map((d) => formatOrderHistoryDeliveryDateWithWeekday(d, language)).join(sep);
}
