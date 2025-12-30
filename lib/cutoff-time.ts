/**
 * Cutoff time utilities for daily delivery orders
 */

export interface CutoffTime {
  hour: number;
  minute: number;
}

const DEFAULT_CUTOFF: CutoffTime = {
  hour: 11,
  minute: 59
};

/**
 * Fetch the cutoff time from settings
 * Returns default (11:59 AM) if fetch fails
 */
export async function getCutoffTime(): Promise<CutoffTime> {
  try {
    const response = await fetch('/api/settings?key=cutoffTime', {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.warn('Failed to fetch cutoff time settings, using default');
      return DEFAULT_CUTOFF;
    }
    
    const data = await response.json();
    
    if (data.success && data.data?.value) {
      return {
        hour: data.data.value.hour ?? DEFAULT_CUTOFF.hour,
        minute: data.data.value.minute ?? DEFAULT_CUTOFF.minute
      };
    }
    
    return DEFAULT_CUTOFF;
  } catch (error) {
    console.warn('Error fetching cutoff time, using default:', error);
    return DEFAULT_CUTOFF;
  }
}

/**
 * Format cutoff time for display (e.g., "11:59 AM")
 */
export function formatCutoffTime(cutoff: CutoffTime): string {
  const period = cutoff.hour >= 12 ? 'PM' : 'AM';
  const displayHour = cutoff.hour === 0 ? 12 : cutoff.hour > 12 ? cutoff.hour - 12 : cutoff.hour;
  const displayMinute = cutoff.minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Check if current time is past the cutoff time
 */
export function isPastCutoff(currentHour: number, currentMinute: number, cutoff: CutoffTime): boolean {
  return currentHour > cutoff.hour || (currentHour === cutoff.hour && currentMinute > cutoff.minute);
}

