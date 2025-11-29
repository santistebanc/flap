/**
 * Shared types for all scrapers
 * These types match the Redis types exactly
 */

export interface SearchParams {
    originplace?: string;
    destinationplace?: string;
    outbounddate?: string;
    inbounddate?: string;
}

/**
 * Tools object passed to scrapers for saving entities
 */
export interface ScraperTools {
    addFlight: (flight: Flight) => Promise<void>;
    addTrip: (trip: Trip) => Promise<void>;
    addLeg: (leg: Leg) => Promise<void>;
    addDeal: (deal: Deal) => Promise<void>;
}

/**
 * Flight - matches Redis Flight type exactly
 */
export interface Flight {
  id: string; // Generated as: `${flightNumber}_${origin}_${departureDate}_${departureTime}`
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  departure_date: string; // ISO date string (YYYY-MM-DD)
  departure_time: string; // Time string (HH:MM)
  arrival_date: string; // ISO date string (YYYY-MM-DD)
  arrival_time: string; // Time string (HH:MM)
  duration: number; // minutes
  created_at: string; // ISO timestamp string
}

/**
 * Leg - matches Redis Leg type exactly
 */
export interface Leg {
  id: string; // Generated as: `${tripId}_outbound_${flightId}` or `${tripId}_inbound_${flightId}`
  trip: string; // Foreign key → trips.id
  flight: string; // Foreign key → flights.id
  inbound: boolean;
  order: number; // Order within the trip (0-based)
  connection_time: number | null; // Minutes between flights, or null for last leg
  created_at: string; // ISO timestamp string
}

/**
 * Trip - matches Redis Trip type exactly
 */
export interface Trip {
  id: string; // Generated as: SHA-256 hash of sorted flight IDs joined by `|`
  created_at: string; // ISO timestamp string
}

/**
 * Deal - matches Redis Deal type exactly
 */
export interface Deal {
  id: string; // Generated as: `${tripId}_${source}_${provider}`
  trip: string; // Foreign key → trips.id
  origin: string;
  destination: string;
  is_round: boolean;
  departure_date: string; // ISO date string (YYYY-MM-DD)
  departure_time: string; // Time string (HH:MM)
  return_date: string | null; // ISO date string (YYYY-MM-DD) or null
  return_time: string | null; // Time string (HH:MM) or null
  source: string;
  provider: string;
  price: number; // float (real)
  link: string;
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}