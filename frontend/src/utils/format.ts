/**
 * Formatting utility functions
 */
import { formatDistanceToNow } from 'date-fns';
import numeral from 'numeral';

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function formatTime(time: string): string {
  return time.substring(0, 5);
}

export function formatPrice(price: number): string {
  return `€${numeral(price).format('0.00')}`;
}

/**
 * Formats a date string as a relative time (e.g., "2 minutes ago", "just now")
 */
export function formatDateTime(dateString?: string): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const result = formatDistanceToNow(date, { addSuffix: true });
    // formatDistanceToNow returns "about X ago", but we want "X ago" or "just now"
    if (result.includes('less than a minute')) {
      return 'just now';
    }
    return result;
  } catch {
    return null;
  }
}

