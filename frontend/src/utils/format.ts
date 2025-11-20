/**
 * Formatting utility functions
 */

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function formatTime(time: string): string {
  return time.substring(0, 5);
}

export function formatPrice(price: number): string {
  return `€${price.toFixed(2)}`;
}

