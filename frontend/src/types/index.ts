export interface Deal {
  id: string;
  trip: string;
  origin: string;
  destination: string;
  is_round: boolean;
  departure_date: string;
  departure_time: string;
  return_date: string | null;
  return_time: string | null;
  source: string;
  provider: string;
  price: number;
  link: string;
  created_at: string;
  updated_at: string;
}

export interface Flight {
  id: string;
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  duration: number;
  created_at: string;
  leg?: {
    id: string;
    trip: string;
    flight: string;
    inbound: boolean;
    order: number;
    connection_time: number | null;
    created_at: string;
  };
}

// SearchRequest type is now defined in schemas/searchParams.ts using Zod
// Re-export for backward compatibility
export type { SearchRequest } from '../schemas/searchParams';

export interface Airport {
  code: string;
  name: string;
}

export interface DateTime {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

export interface Airline {
  name: string;
}

export interface SearchResultLeg {
  legId: string;
  flightId: string;
  flightNumber: string;
  origin: Airport;
  destination: Airport;
  departure: DateTime;
  arrival: DateTime;
  duration: string;
  airline: Airline;
  cabinClass: string;
  connectionTime?: string;
}

export interface SearchResult {
  tripId: string;
  origin: Airport;
  destination: Airport;
  outboundLegs: SearchResultLeg[];
  inboundLegs: SearchResultLeg[];
  deals: {
    dealId: string;
    price: string;
    provider: string;
    link?: string;
    last_update: string;
  }[];
}

