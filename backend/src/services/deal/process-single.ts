/**
 * Process a single deal and store it in the database
 */
import { DealData } from '../../domains/deal/types';
import {
  storeTrip,
  storeFlight,
  storeLeg,
  storeDeal,
  getTrip,
} from '../../utils/redis';
import { generateTripId } from '../../utils/ids';
import { createFlightsFromFlightData } from '../../builders/flight/create-from-flight-data';
import { createLegsFromFlights } from '../../builders/leg/create-from-flights';
import { getOrCreateTrip } from '../../builders/trip/get-or-create';
import { createDealFromDealData } from '../../builders/deal/create-from-deal-data';
import { calculateExpiration } from '../../utils/redis';

export async function processDeal(
  dealData: DealData,
  source: string,
  request: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
  },
  createdAt: string
): Promise<string> {
  // Create flights from flight data
  const { flights, flightIds } = createFlightsFromFlightData(dealData.flights, createdAt);

  // Generate trip ID
  const tripId = generateTripId(flightIds);

  // Get or create trip
  const trip = await getOrCreateTrip(
    tripId,
    createdAt,
    request.departureDate,
    getTrip,
    storeTrip
  );

  // Store flights with expiration
  const expiration = calculateExpiration(request.departureDate);
  for (const flight of flights) {
    await storeFlight(flight, expiration);
  }

  // Create legs
  const legs = createLegsFromFlights(flights, tripId, dealData, createdAt);
  for (const leg of legs) {
    await storeLeg(leg, expiration);
  }

  // Create deal
  const deal = createDealFromDealData(
    dealData,
    tripId,
    source,
    request,
    flights,
    createdAt
  );

  await storeDeal(deal, expiration);

  return tripId;
}

