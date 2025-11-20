import { Job } from 'bullmq';
import { FlightJobData } from '../services/queue';
import { Flight, Trip, Leg, Deal } from '../types';
import {
  storeTrip,
  storeFlight,
  storeLeg,
  storeDeal,
  calculateExpiration,
  getTrip,
  getLegsByTrip,
  storeSearchTrips,
} from '../utils/redis';
import { generateFlightId, generateTripId, generateDealId, generateLegId } from '../utils/ids';
import { fetchSkyscanner, db } from '../utils/skyscanner-scraper';

interface FlightData {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  duration: number;
}

interface DealData {
  provider: string;
  price: number;
  link: string;
  flights: FlightData[];
  stopCount: number;
  isRound: boolean;
}

// Helper function to parse duration string (e.g., "3h 30m" or "195m") to minutes
function parseDurationToMinutes(durationStr: string | null | undefined): number {
  if (!durationStr) return 0;
  
  const cleaned = durationStr.trim();
  
  // Try to match patterns like "3h 30m", "2h", "45m", etc.
  const hourMatch = cleaned.match(/(\d+)\s*h/i);
  const minuteMatch = cleaned.match(/(\d+)\s*m/i);
  
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
  
  return hours * 60 + minutes;
}

// Helper function to convert scraper Flight format to FlightData format
function convertScraperFlightToFlightData(scraperFlight: any, request: { departureDate: string; returnDate?: string }): FlightData {
  return {
    flightNumber: scraperFlight.flightNumber || '',
    airline: scraperFlight.airline?.name || '',
    origin: scraperFlight.origin?.code || '',
    destination: scraperFlight.destination?.code || '',
    departureDate: scraperFlight.departure?.date || request.departureDate,
    departureTime: scraperFlight.departure?.time || '',
    arrivalDate: scraperFlight.arrival?.date || scraperFlight.departure?.date || request.departureDate,
    arrivalTime: scraperFlight.arrival?.time || '',
    duration: parseDurationToMinutes(scraperFlight.duration),
  };
}

// Skyscanner API client using the scraper
async function fetchSkyscannerFlights(request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): Promise<DealData[]> {
  try {
    console.log('[Skyscanner] Starting fetch with params:', request);
    
    // Clear the scraper's in-memory DB before fetching new data
    db.clear();
    console.log('[Skyscanner] Cleared in-memory DB');
    
    // Prepare search parameters for the scraper
    const searchParams = {
      originplace: request.origin,
      destinationplace: request.destination,
      outbounddate: request.departureDate,
      inbounddate: request.returnDate || '',
    };
    
    console.log('[Skyscanner] Calling fetchSkyscanner with params:', searchParams);
    
    // Fetch flights from Skyscanner
    const result = await fetchSkyscanner(searchParams);
    
    console.log('[Skyscanner] fetchSkyscanner result:', {
      success: result.success,
      error: result.error,
      flightsCount: result.flights?.length || 0,
    });
    
    if (!result.success) {
      console.error('[Skyscanner] Fetch failed:', result.error);
      return [];
    }
    
    // Get all trips with their deals from the scraper's DB
    const tripsWithDeals = db.getAllTripsWithDeals();
    console.log('[Skyscanner] Found trips with deals:', tripsWithDeals.length);
    
    if (tripsWithDeals.length === 0) {
      console.warn('[Skyscanner] No trips found in DB after fetch. This might indicate the scraper found no flights or extraction failed.');
      return [];
    }
    
    // Convert scraper format to DealData format
    const deals: DealData[] = [];
    
    for (const { trip, deals: scraperDeals } of tripsWithDeals) {
      console.log(`[Skyscanner] Processing trip ${trip.id} with ${scraperDeals.length} deals`);
      // Get all flights for this trip from the scraper's DB
      const allFlights = db.getAllFlights();
      const tripFlightIds = new Set([
        ...trip.outboundLegs.map(leg => leg.flight),
        ...trip.inboundLegs.map(leg => leg.flight),
      ]);
      
      const tripFlights = allFlights.filter(flight => tripFlightIds.has(flight.id));
      
      // Sort flights by order (outbound first, then inbound)
      const outboundFlights = trip.outboundLegs
        .map(leg => tripFlights.find(f => f.id === leg.flight))
        .filter((f): f is any => f !== undefined);
      
      const inboundFlights = trip.inboundLegs
        .map(leg => tripFlights.find(f => f.id === leg.flight))
        .filter((f): f is any => f !== undefined);
      
      // Convert each deal to DealData format
      for (const scraperDeal of scraperDeals) {
        // Combine outbound and inbound flights
        const allTripFlights = [...outboundFlights, ...inboundFlights];
        
        // Convert scraper flights to FlightData format
        const flightData: FlightData[] = allTripFlights.map(flight => 
          convertScraperFlightToFlightData(flight, request)
        );
        
        // Parse price (remove commas and convert to number)
        const priceStr = scraperDeal.price.replace(/,/g, '');
        const price = parseFloat(priceStr) || 0;
        
        // Calculate stop count (number of legs - 1 for outbound, same for inbound if round trip)
        const outboundStopCount = Math.max(0, trip.outboundLegs.length - 1);
        const inboundStopCount = trip.inboundLegs.length > 0 ? Math.max(0, trip.inboundLegs.length - 1) : 0;
        const totalStopCount = outboundStopCount + inboundStopCount;
        
        deals.push({
          provider: scraperDeal.provider,
          price: price,
          link: scraperDeal.link || '',
          flights: flightData,
          stopCount: totalStopCount,
          isRound: trip.inboundLegs.length > 0,
        });
      }
    }
    
    console.log(`[Skyscanner] Successfully converted ${deals.length} deals`);
    return deals;
  } catch (error) {
    console.error('[Skyscanner] Error fetching flights:', error);
    if (error instanceof Error) {
      console.error('[Skyscanner] Error stack:', error.stack);
    }
    return [];
  }
}

async function fetchKiwiFlights(request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): Promise<DealData[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 2500));
  
  // Mock data with multi-leg trips
  return [
    {
      provider: 'Kiwi Direct',
      price: 380.00,
      link: 'https://kiwi.com/deal/1',
      flights: [
        {
          flightNumber: 'UA321',
          airline: 'United Airlines',
          origin: request.origin,
          destination: request.destination,
          departureDate: request.departureDate,
          departureTime: '08:00',
          arrivalDate: request.departureDate,
          arrivalTime: '11:20',
          duration: 200,
        },
      ],
      stopCount: 0,
      isRound: !!request.returnDate,
    },
    {
      provider: 'Kiwi Multi-Stop',
      price: 340.50,
      link: 'https://kiwi.com/deal/2',
      flights: [
        {
          flightNumber: 'B6101',
          airline: 'JetBlue',
          origin: request.origin,
          destination: 'BOS',
          departureDate: request.departureDate,
          departureTime: '07:30',
          arrivalDate: request.departureDate,
          arrivalTime: '10:15',
          duration: 165,
        },
        {
          flightNumber: 'B6102',
          airline: 'JetBlue',
          origin: 'BOS',
          destination: 'MIA',
          departureDate: request.departureDate,
          departureTime: '12:00',
          arrivalDate: request.departureDate,
          arrivalTime: '15:20',
          duration: 200,
        },
        {
          flightNumber: 'B6103',
          airline: 'JetBlue',
          origin: 'MIA',
          destination: request.destination,
          departureDate: request.departureDate,
          departureTime: '17:00',
          arrivalDate: request.departureDate,
          arrivalTime: '19:30',
          duration: 150,
        },
      ],
      stopCount: 2,
      isRound: !!request.returnDate,
    },
    {
      provider: 'Kiwi Budget',
      price: 315.00,
      link: 'https://kiwi.com/deal/3',
      flights: [
        {
          flightNumber: 'FR701',
          airline: 'Frontier',
          origin: request.origin,
          destination: 'LAS',
          departureDate: request.departureDate,
          departureTime: '09:45',
          arrivalDate: request.departureDate,
          arrivalTime: '12:30',
          duration: 165,
        },
        {
          flightNumber: 'FR702',
          airline: 'Frontier',
          origin: 'LAS',
          destination: request.destination,
          departureDate: request.departureDate,
          departureTime: '14:15',
          arrivalDate: request.departureDate,
          arrivalTime: '16:45',
          duration: 150,
        },
      ],
      stopCount: 1,
      isRound: !!request.returnDate,
    },
  ];
}

export async function processFlightJob(job: Job<FlightJobData>): Promise<number> {
  const { searchId, source, request } = job.data;
  
  console.log(`[processFlightJob] Processing job for source: ${source}, searchId: ${searchId}`);
  
  try {
    let deals: DealData[];
    
    switch (source) {
      case 'skyscanner':
        console.log('[processFlightJob] Using REAL Skyscanner scraper (not mock)');
        deals = await fetchSkyscannerFlights(request);
        break;
      case 'kiwi':
        deals = await fetchKiwiFlights(request);
        break;
      default:
        throw new Error(`Unknown source: ${source}`);
    }
    
    const now = new Date().toISOString();
    const tripIds: string[] = [];
    
    // Process each deal
    for (const dealData of deals) {
      // Generate flight IDs and store flights
      const flightIds: string[] = [];
      const flights: Flight[] = [];
      
      for (const flightData of dealData.flights) {
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
          created_at: now,
        };
        
        flights.push(flight);
        flightIds.push(flightId);
      }
      
      // Generate trip ID
      const tripId = generateTripId(flightIds);
      
      // Check if trip exists, if not create it
      let trip = await getTrip(tripId);
      if (!trip) {
        trip = {
          id: tripId,
          created_at: now,
        };
        const expiration = calculateExpiration(request.departureDate);
        await storeTrip(trip, expiration);
      }
      
      // Store flights with expiration
      const expiration = calculateExpiration(request.departureDate);
      for (const flight of flights) {
        await storeFlight(flight, expiration);
      }
      
      // Create legs
      const legs: Leg[] = [];
      for (let i = 0; i < flights.length; i++) {
        const flight = flights[i];
        const isInbound = dealData.isRound && i >= dealData.flights.length / 2;
        const legId = generateLegId(tripId, flight.id, isInbound);
        
        let connectionTime: number | null = null;
        if (i < flights.length - 1) {
          const currentArrival = new Date(`${flight.arrival_date}T${flight.arrival_time}`);
          const nextDeparture = new Date(`${flights[i + 1].departure_date}T${flights[i + 1].departure_time}`);
          connectionTime = Math.floor((nextDeparture.getTime() - currentArrival.getTime()) / (1000 * 60));
        }
        
        const leg: Leg = {
          id: legId,
          trip: tripId,
          flight: flight.id,
          inbound: isInbound,
          order: i,
          connection_time: connectionTime,
          created_at: now,
        };
        
        legs.push(leg);
        await storeLeg(leg, expiration);
      }
      
      // Create deal
      const dealId = generateDealId(tripId, source, dealData.provider);
      const deal: Deal = {
        id: dealId,
        trip: tripId,
        origin: request.origin,
        destination: request.destination,
        stop_count: dealData.stopCount,
        duration: flights.reduce((sum, f) => sum + f.duration, 0),
        is_round: dealData.isRound,
        departure_date: request.departureDate,
        departure_time: flights[0].departure_time,
        return_date: request.returnDate || null,
        return_time: request.returnDate ? flights[flights.length - 1].arrival_time : null,
        source: source,
        provider: dealData.provider,
        price: dealData.price,
        link: dealData.link,
        created_at: now,
        updated_at: now,
      };
      
      await storeDeal(deal, expiration);
      tripIds.push(tripId);
    }
    
    // Store trip IDs for this search
    if (tripIds.length > 0) {
      await storeSearchTrips(searchId, tripIds);
    }
    
    console.log(`Processed ${deals.length} deals from ${source} for search ${searchId}`);
    return deals.length;
  } catch (error) {
    console.error(`Error processing flight job for ${source}:`, error);
    throw error;
  }
}

