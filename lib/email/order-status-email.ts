import type { Language } from '@/lib/email-translations';
import { getDayName } from '@/lib/email-translations';

export type OrderStatusEmailItem = {
  day?: string;
  date?: string;
  comboName?: string;
  type?: string;
  quantity?: number;
  dayId?: string;
  optionName?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDayDateLabel(item: OrderStatusEmailItem, language: Language): string {
  const date = item.date || '';
  if (item.dayId) {
    return `${getDayName(item.dayId, language)} (${escapeHtml(date)})`;
  }
  if (item.day) {
    const dayPart = item.day.split('-')[0];
    const dayName = dayPart
      ? dayPart.charAt(0).toUpperCase() + dayPart.slice(1).toLowerCase()
      : '';
    return dayName ? `${escapeHtml(dayName)} (${escapeHtml(date)})` : `(${escapeHtml(date)})`;
  }
  return date ? `(${escapeHtml(date)})` : '';
}

/**
 * One line of HTML (no <li>) for order status emails — supports daily combo rows and weekly option rows.
 */
export function formatOrderStatusEmailLineHtml(item: OrderStatusEmailItem, language: Language): string {
  const qty = Math.max(0, Number(item.quantity) || 0);
  const dayDate = formatDayDateLabel(item, language);

  const isWeeklyLine = item.dayId != null && item.optionName != null;
  if (isWeeklyLine) {
    const name = escapeHtml(item.optionName || '');
    const suffix =
      language === 'zh'
        ? `${qty}份餐点`
        : `${qty} meal${qty === 1 ? '' : 's'}`;
    return `<span style="font-weight: bold;">${dayDate}</span>: ${name} <span style="color: #666;">— ${suffix}</span>`;
  }

  const comboName = escapeHtml(item.comboName || '');
  const isTwo = item.type === 'A';
  const voucherSuffix =
    language === 'zh'
      ? `${qty}张${isTwo ? '2菜' : '3菜'}餐券`
      : `${qty} x ${isTwo ? '2-dish' : '3-dish'} voucher${qty === 1 ? '' : 's'}`;

  return `<span style="font-weight: bold;">${dayDate}</span>: ${comboName} <span style="color: #666;">— ${voucherSuffix}</span>`;
}
