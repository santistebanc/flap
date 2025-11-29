/**
 * Create Leg objects from flights and deal data
 */
import { Leg, Flight } from '../../types';
import { generateLegId } from '../../utils/ids';
import { parseConnectionTimeToMinutes, calculateConnectionTime } from '../../parsers/time';
import { DealData } from '../../domains/deal/types';

export function createLegsFromFlights(
  flights: Flight[],
  tripId: string,
  dealData: DealData,
  createdAt: string
): Leg[] {
  const legs: Leg[] = [];

  for (let i = 0; i < flights.length; i++) {
    const flight = flights[i];
    const isInbound = dealData.isRound && i >= dealData.flights.length / 2;
    const legId = generateLegId(tripId, flight.id, isInbound);

    let connectionTime: number | null = null;

    // Use connection time from scraper if available
    if (dealData.connectionTimes && dealData.connectionTimes[i]) {
      connectionTime = parseConnectionTimeToMinutes(dealData.connectionTimes[i]);
    }

    // Fallback to calculating from flight times if scraper connection time not available
    if (connectionTime === null && i < flights.length - 1) {
      connectionTime = calculateConnectionTime(
        flight.arrival_date,
        flight.arrival_time,
        flights[i + 1].departure_date,
        flights[i + 1].departure_time
      );
    }

    const leg: Leg = {
      id: legId,
      trip: tripId,
      flight: flight.id,
      inbound: isInbound,
      order: i,
      connection_time: connectionTime,
      created_at: createdAt,
    };

    legs.push(leg);
  }

  return legs;
}

