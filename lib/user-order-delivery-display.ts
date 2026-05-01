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
  return dates.join(sep);
}
