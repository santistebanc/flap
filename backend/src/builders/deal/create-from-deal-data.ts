/**
 * Create Deal object from DealData
 */
import { Deal, Flight } from '../../types';
import { generateDealId } from '../../utils/ids';
import { DealData } from '../../domains/deal/types';

export function createDealFromDealData(
  dealData: DealData,
  tripId: string,
  source: string,
  request: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
  },
  flights: Flight[],
  createdAt: string
): Deal {
  const dealId = generateDealId(source, request, tripId, dealData.provider);

  return {
    id: dealId,
    trip: tripId,
    origin: request.origin,
    destination: request.destination,
    is_round: dealData.isRound,
    departure_date: request.departureDate,
    departure_time: flights[0].departure_time,
    return_date: request.returnDate || null,
    return_time: request.returnDate ? flights[flights.length - 1].arrival_time : null,
    source: source,
    provider: dealData.provider,
    price: dealData.price,
    link: dealData.link,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

