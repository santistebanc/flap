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

// Mock API clients - replace with actual API implementations
async function fetchSkyscannerFlights(request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): Promise<DealData[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000));
  
  // Mock data with various trip configurations
  return [
    {
      provider: 'Expedia',
      price: 450.99,
      link: 'https://skyscanner.com/deal/1',
      flights: [
        {
          flightNumber: 'AA123',
          airline: 'American Airlines',
          origin: request.origin,
          destination: request.destination,
          departureDate: request.departureDate,
          departureTime: '14:30',
          arrivalDate: request.departureDate,
          arrivalTime: '17:45',
          duration: 195,
        },
      ],
      stopCount: 0,
      isRound: !!request.returnDate,
    },
    {
      provider: 'Kayak',
      price: 520.50,
      link: 'https://skyscanner.com/deal/2',
      flights: [
        {
          flightNumber: 'DL456',
          airline: 'Delta',
          origin: request.origin,
          destination: 'JFK',
          departureDate: request.departureDate,
          departureTime: '10:00',
          arrivalDate: request.departureDate,
          arrivalTime: '13:15',
          duration: 195,
        },
        {
          flightNumber: 'DL789',
          airline: 'Delta',
          origin: 'JFK',
          destination: request.destination,
          departureDate: request.departureDate,
          departureTime: '15:30',
          arrivalDate: request.departureDate,
          arrivalTime: '18:00',
          duration: 150,
        },
      ],
      stopCount: 1,
      isRound: !!request.returnDate,
    },
    {
      provider: 'CheapOair',
      price: 380.75,
      link: 'https://skyscanner.com/deal/3',
      flights: [
        {
          flightNumber: 'UA201',
          airline: 'United Airlines',
          origin: request.origin,
          destination: 'ORD',
          departureDate: request.departureDate,
          departureTime: '06:00',
          arrivalDate: request.departureDate,
          arrivalTime: '09:30',
          duration: 210,
        },
        {
          flightNumber: 'UA302',
          airline: 'United Airlines',
          origin: 'ORD',
          destination: 'ATL',
          departureDate: request.departureDate,
          departureTime: '11:00',
          arrivalDate: request.departureDate,
          arrivalTime: '13:45',
          duration: 165,
        },
        {
          flightNumber: 'UA403',
          airline: 'United Airlines',
          origin: 'ATL',
          destination: request.destination,
          departureDate: request.departureDate,
          departureTime: '15:30',
          arrivalDate: request.departureDate,
          arrivalTime: '17:20',
          duration: 110,
        },
      ],
      stopCount: 2,
      isRound: !!request.returnDate,
    },
    {
      provider: 'Priceline',
      price: 495.25,
      link: 'https://skyscanner.com/deal/4',
      flights: [
        {
          flightNumber: 'SW501',
          airline: 'Southwest',
          origin: request.origin,
          destination: 'DEN',
          departureDate: request.departureDate,
          departureTime: '08:15',
          arrivalDate: request.departureDate,
          arrivalTime: '11:45',
          duration: 210,
        },
        {
          flightNumber: 'SW602',
          airline: 'Southwest',
          origin: 'DEN',
          destination: request.destination,
          departureDate: request.departureDate,
          departureTime: '13:00',
          arrivalDate: request.departureDate,
          arrivalTime: '15:30',
          duration: 150,
        },
      ],
      stopCount: 1,
      isRound: !!request.returnDate,
    },
  ];
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

export async function processFlightJob(job: Job<FlightJobData>): Promise<void> {
  const { searchId, source, request } = job.data;
  
  try {
    let deals: DealData[];
    
    switch (source) {
      case 'skyscanner':
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
  } catch (error) {
    console.error(`Error processing flight job for ${source}:`, error);
    throw error;
  }
}

