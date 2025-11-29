import { SearchParams } from '../schemas/searchParams';

/**
 * Helper to build search params object for navigation
 * Automatically handles optional fields and removes empty values
 */
export function buildSearchParams(params: Partial<SearchParams>): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  if (params.origin) {
    result.origin = params.origin.toUpperCase();
  }
  if (params.destination) {
    result.destination = params.destination.toUpperCase();
  }
  if (params.departureDate) {
    result.departureDate = params.departureDate;
  }

  // Only include returnDate if roundTrip is true
  if (params.roundTrip) {
    if (params.returnDate) {
      result.returnDate = params.returnDate;
    }
    result.roundTrip = true;
  }

  // Remove empty values
  Object.keys(result).forEach((key) => {
    const value = result[key];
    if (value === '' || value === undefined || value === null || (key === 'roundTrip' && value === false)) {
      delete result[key];
    }
  });

  return result;
}

