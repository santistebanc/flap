/**
 * Create Leg objects from Flight objects
 */
import { Flight, Leg } from '../../shared/types';
import { generateLegId } from '../../../utils/ids';
import { parseConnectionTimeToMinutes } from '../../../parsers/time/parse-connection-time';

export interface LegWithConnectionTime {
    leg: Leg;
    connectionTime?: string;
}

export function createLegsFromFlights(
    flights: Flight[],
    tripId: string,
    inbound: boolean,
    sectionLegs?: Array<{ connectionTime?: string }>,
    createdAt?: string
): Leg[] {
    const now = createdAt || new Date().toISOString();
    return flights.map((flight, index) => {
        const legId = generateLegId(tripId, flight.id, inbound);
        
        // Parse connection time from string to minutes (number | null)
        let connectionTime: number | null = null;
        if (index < flights.length - 1 && sectionLegs && sectionLegs[index]) {
            const connectionTimeStr = sectionLegs[index].connectionTime;
            if (connectionTimeStr) {
                connectionTime = parseConnectionTimeToMinutes(connectionTimeStr);
            }
        }
        
        const leg: Leg = {
            id: legId,
            trip: tripId,
            flight: flight.id,
            inbound: inbound,
            order: index,
            connection_time: connectionTime,
            created_at: now,
        };
        return leg;
    });
}

