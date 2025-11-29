/**
 * Create or get existing Trip
 */
import { Trip } from '../../types';
import { calculateExpiration } from '../../utils/redis';

export async function getOrCreateTrip(
  tripId: string,
  createdAt: string,
  departureDate: string,
  getTrip: (tripId: string) => Promise<Trip | null>,
  storeTrip: (trip: Trip, expiration: number) => Promise<void>
): Promise<Trip> {
  let trip = await getTrip(tripId);
  if (!trip) {
    trip = {
      id: tripId,
      created_at: createdAt,
    };
    const expiration = calculateExpiration(departureDate);
    await storeTrip(trip, expiration);
  }
  return trip;
}

