import { Job } from 'bullmq';
import { Result, Err } from 'ts-results';
import { match } from 'ts-pattern';
import { FlightJobData } from '../services/queue';
import { fetchSkyscanner } from '../scrapers/skyscanner';
import { fetchKiwi } from '../scrapers/kiwi';
import { convertDateToKiwiFormat } from '../parsers/date/convert-to-kiwi-format';
import { storeFlight, storeTrip, storeLeg, storeDeal, getTrip } from '../utils/redis';
import { calculateExpiration } from '../utils/redis';
import { getOrCreateTrip } from '../builders/trip/get-or-create';
import { Flight, Trip, Deal, Leg, ScraperTools } from '../scrapers/shared/types';
import { fromPromise } from '../utils/result-async';

/**
 * Fetch flights from Skyscanner scraper using tools to save directly to Redis
 */
async function fetchSkyscannerFlights(
  request: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
  },
  tools: ScraperTools
): Promise<Result<number, Error>> {
  return await fromPromise(
    (async () => {
      console.log('[Skyscanner] Starting fetch with params:', request);
      
      // Prepare search parameters for the scraper
      const searchParams = {
        originplace: request.origin,
        destinationplace: request.destination,
        outbounddate: request.departureDate,
        inbounddate: request.returnDate || '',
      };
      
      console.log('[Skyscanner] Calling fetchSkyscanner with params:', searchParams);
      
      // Fetch flights from Skyscanner - tools will save directly to Redis
      const result = await fetchSkyscanner(searchParams, tools);
      
      console.log('[Skyscanner] fetchSkyscanner result:', {
        success: result.success,
        error: result.error,
        dealsCount: result.dealsCount || 0,
      });
      
      if (!result.success) {
        throw new Error(`[Skyscanner] Fetch failed: ${result.error}`);
      }
      
      return result.dealsCount || 0;
    })(),
    (error: unknown) => {
      const errorObj = error instanceof Error 
        ? error 
        : new Error(`[Skyscanner] Unknown error: ${String(error)}`);
      console.error('[Skyscanner] Error fetching flights:', errorObj);
      if (error instanceof Error) {
        console.error('[Skyscanner] Error stack:', error.stack);
      }
      return errorObj;
    }
  );
}

/**
 * Fetch flights from Kiwi scraper using tools to save directly to Redis
 */
async function fetchKiwiFlights(
  request: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
  },
  tools: ScraperTools
): Promise<Result<number, Error>> {
  return await fromPromise(
    (async () => {
      // Prepare search parameters for the Kiwi scraper (dates in DD/MM/YYYY format)
      const searchParams = {
        originplace: request.origin,
        destinationplace: request.destination,
        outbounddate: convertDateToKiwiFormat(request.departureDate),
        inbounddate: request.returnDate ? convertDateToKiwiFormat(request.returnDate) : '',
      };

      // Fetch flights from Kiwi - tools will save directly to Redis
      console.log(`[Kiwi] Fetching with params:`, searchParams);
      const result = await fetchKiwi(searchParams, tools);

      if (!result.success) {
        throw new Error(`[Kiwi] Fetch failed: ${result.error}`);
      }

      console.log(`[Kiwi] Fetch successful, dealsCount: ${result.dealsCount || 0}`);
      
      return result.dealsCount || 0;
    })(),
    (error: unknown) => {
      const errorObj = error instanceof Error 
        ? error 
        : new Error(`[Kiwi] Unknown error: ${String(error)}`);
      console.error('[Kiwi] Error in fetchKiwiFlights:', errorObj);
      return errorObj;
    }
  );
}

/**
 * Process a flight job: fetch flights from source and store in database
 */
export async function processFlightJob(job: Job<FlightJobData>): Promise<number> {
  const { fetchId, source, request } = job.data;
  
  console.log(`[processFlightJob] Processing job for source: ${source}, fetchId: ${fetchId}`);
  
  const expiration = calculateExpiration(request.departureDate);
  let dealsCount = 0;
  
  // Create tools object that saves directly to Redis
  const tools: ScraperTools = {
    addFlight: async (flight: Flight) => {
      await storeFlight(flight, expiration);
    },
    addTrip: async (trip: Trip) => {
      await getOrCreateTrip(
        trip.id,
        trip.created_at,
        request.departureDate,
        getTrip,
        storeTrip
      );
    },
    addLeg: async (leg: Leg) => {
      await storeLeg(leg, expiration);
    },
    addDeal: async (deal: Deal) => {
      await storeDeal(deal, expiration);
      dealsCount++;
    },
  };
  
  // Fetch flights from the appropriate source - tools will save directly to Redis
  const fetchResult = await match(source)
    .with('skyscanner', () => {
      console.log('[processFlightJob] Using REAL Skyscanner scraper (not mock)');
      return fetchSkyscannerFlights(request, tools);
    })
    .with('kiwi', () => fetchKiwiFlights(request, tools))
    .otherwise(() => Err(new Error(`Unknown source: ${source}`)));

  // Handle fetch result
  if (fetchResult.err) {
    console.error(`Error fetching flights from ${source}:`, fetchResult.val);
    throw fetchResult.val;
  }

  const fetchedDealsCount = fetchResult.val;
  
  console.log(`Processed ${fetchedDealsCount} deals from ${source} for fetch ${fetchId}`);
  return fetchedDealsCount;
}

