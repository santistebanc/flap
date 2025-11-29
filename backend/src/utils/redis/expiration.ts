/**
 * Calculate expiration time for Redis keys
 */
export function calculateExpiration(departureDate: string): number {
  const departure = new Date(departureDate);
  const expiration = new Date(departure);
  expiration.setDate(expiration.getDate() + 2);
  const now = new Date();
  const secondsUntilExpiration = Math.max(0, Math.floor((expiration.getTime() - now.getTime()) / 1000));
  return secondsUntilExpiration;
}

