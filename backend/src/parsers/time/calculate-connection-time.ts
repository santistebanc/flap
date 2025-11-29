/**
 * Calculate connection time between two flights in minutes
 */
export function calculateConnectionTime(
  arrivalDate: string,
  arrivalTime: string,
  nextDepartureDate: string,
  nextDepartureTime: string
): number {
  const currentArrival = new Date(`${arrivalDate}T${arrivalTime}`);
  const nextDeparture = new Date(`${nextDepartureDate}T${nextDepartureTime}`);
  return Math.floor((nextDeparture.getTime() - currentArrival.getTime()) / (1000 * 60));
}

