/**
 * Create Deal objects from price information
 * Creates Deal objects matching Redis structure exactly
 */
import { Deal, Leg, Flight, ScraperTools } from '../../shared/types';
import { generateDealId } from '../../../utils/ids';

export interface PriceInfo {
    price: string;
    provider: string;
    link?: string;
}

export async function createDealsFromPrices(
    prices: PriceInfo[],
    tripId: string,
    source: string,
    request: {
        origin: string;
        destination: string;
        departureDate: string;
        returnDate?: string;
    },
    tripLegs: Leg[],
    tripFlights: Flight[],
    tools: ScraperTools,
    createdAt?: string
): Promise<number> {
    const now = createdAt || new Date().toISOString();
    
    // Get first and last flight times
    const firstFlight = tripFlights[0];
    const lastFlight = tripFlights[tripFlights.length - 1];
    
    let dealsCount = 0;
    for (const priceInfo of prices) {
        const dealId = generateDealId(source, request, tripId, priceInfo.provider);
        const deal: Deal = {
            id: dealId,
            trip: tripId,
            origin: request.origin,
            destination: request.destination,
            is_round: tripLegs.some(l => l.inbound),
            departure_date: request.departureDate,
            departure_time: firstFlight?.departure_time || '',
            return_date: request.returnDate || null,
            return_time: request.returnDate && lastFlight ? lastFlight.arrival_time : null,
            source: source,
            provider: priceInfo.provider,
            price: parseFloat(priceInfo.price.replace(/,/g, '')),
            link: priceInfo.link || '',
            created_at: now,
            updated_at: now,
        };
        await tools.addDeal(deal);
        dealsCount++;
    }
    
    return dealsCount;
}

