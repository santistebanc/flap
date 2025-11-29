/**
 * Create Flight objects from FlightData array
 */
import { Flight } from '../../types';
import { generateFlightId } from '../../utils/ids';
import { FlightData } from '../../converters/flight/types';

export function createFlightsFromFlightData(
  flightsData: FlightData[],
  createdAt: string
): { flights: Flight[]; flightIds: string[] } {
  const flights: Flight[] = [];
  const flightIds: string[] = [];

  for (const flightData of flightsData) {
    const flightId = generateFlightId({
      flightNumber: flightData.flightNumber,
      origin: flightData.origin,
      departureDate: flightData.departureDate,
      departureTime: flightData.departureTime,
    });

    const flight: Flight = {
      id: flightId,
      flight_number: flightData.flightNumber,
      airline: flightData.airline,
      origin: flightData.origin,
      destination: flightData.destination,
      departure_date: flightData.departureDate,
      departure_time: flightData.departureTime,
      arrival_date: flightData.arrivalDate,
      arrival_time: flightData.arrivalTime,
      duration: flightData.duration,
      created_at: createdAt,
    };

    flights.push(flight);
    flightIds.push(flightId);
  }

  return { flights, flightIds };
}

