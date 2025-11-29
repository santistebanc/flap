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
  return `${flight.origin}_${flight.departureDate}_${sanitizedTime}_${flight.flightNumber}`;
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
    request.returnDate || '-',
  ];
  return parts.join('|');
}

export function generateSourceSearchId(source: string, request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): string {
  return generateSearchId(request) + '|' + source
}

export function generateTripId(flightIds: string[]): string {
  const sortedIds = flightIds.join('|');
  const hash = crypto.createHash('sha256').update(sortedIds).digest('hex');
  // Use first 16 characters for shorter tripId (64 bits of entropy)
  return hash.substring(0, 16);
}

export function generateDealId(
  source: string,
  request: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
  },
  tripId: string,
  provider: string
): string {
  const searchId = generateSearchId(request);
  return `${searchId}_${source}_${provider}_${tripId}`;
}

export function generateLegId(tripId: string, flightId: string, inbound: boolean): string {
  const direction = inbound ? 'I' : 'O';
  return `${tripId}_${direction}_${flightId}`;
}

