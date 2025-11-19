import crypto from 'crypto';

export function generateFlightId(flight: {
  flightNumber: string;
  origin: string;
  departureDate: string;
  departureTime: string;
}): string {
  // Replace colons in time to avoid Redis key issues (HH:MM or HH:MM:SS -> HH-MM)
  // Also remove seconds if present
  let sanitizedTime = flight.departureTime.replace(/:/g, '-');
  // If time has seconds (HH-MM-SS), remove the seconds part
  if (sanitizedTime.match(/^\d{2}-\d{2}-\d{2}$/)) {
    sanitizedTime = sanitizedTime.substring(0, 5); // Keep only HH-MM
  }
  return `${flight.flightNumber}_${flight.origin}_${flight.departureDate}_${sanitizedTime}`;
}

export function generateSearchId(request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): string {
  const parts = [
    request.origin,
    request.destination,
    request.departureDate,
    request.returnDate || 'oneway',
  ];
  const searchKey = parts.join('|');
  // Hash the search key to create a consistent searchId
  return crypto.createHash('sha256').update(searchKey).digest('hex');
}

export function generateTripId(flightIds: string[]): string {
  const sortedIds = [...flightIds].sort().join('|');
  return crypto.createHash('sha256').update(sortedIds).digest('hex');
}

export function generateDealId(tripId: string, source: string, provider: string): string {
  return `${tripId}_${source}_${provider}`;
}

export function generateLegId(tripId: string, flightId: string, inbound: boolean): string {
  const direction = inbound ? 'inbound' : 'outbound';
  return `${direction}_${flightId}_${tripId}`;
}

