/**
 * Create Trip object from outbound and inbound flights
 * Uses the same ID generator as Redis
 */
import { Flight, Leg, Trip } from '../../shared/types';
import { generateTripId } from '../../../utils/ids';

export function createTripFromFlights(
    outboundFlights: Flight[],
    inboundFlights: Flight[],
    outboundLegs: Leg[],
    inboundLegs: Leg[],
    createdAt?: string
): Trip {
    // Get all flight IDs from legs
    const allFlightIds = [...outboundLegs, ...inboundLegs].map(leg => leg.flight);
    
    // Create Trip object using the same generator as Redis
    const tripId = generateTripId(allFlightIds);
    const now = createdAt || new Date().toISOString();
    const trip: Trip = {
        id: tripId,
        created_at: now,
    };

    return trip;
}

