/**
 * Process multiple deals and store them in the database
 */
import { DealData } from '../../domains/deal/types';
import { processDeal } from './process-single';

export async function processDeals(
  deals: DealData[],
  source: string,
  request: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
  },
  searchId: string
): Promise<number> {
  const createdAt = new Date().toISOString();
  const tripIds: string[] = [];

  for (const dealData of deals) {
    const tripId = await processDeal(dealData, source, request, createdAt);
    tripIds.push(tripId);
  }

  return deals.length;
}

