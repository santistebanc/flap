/**
 * Deals table - Represents flight deals/offers
 */
export interface Deal {
  id: string; // Generated as: `${tripId}_skyscanner_${provider}` (e.g., "abc123..._skyscanner_Expedia")
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

/**
 * Flights table - Individual flight segments
 */
export interface Flight {
  id: string; // Generated as: `${flightNumber}_${origin}_${departureDate}_${departureTime}` (e.g., "AA123_LAX_2024-01-15_14-30")
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  departure_date: string; // ISO date string (YYYY-MM-DD)
  departure_time: string; // Time string (HH:MM)
  arrival_date: string; // ISO date string (YYYY-MM-DD)
  arrival_time: string; // Time string (HH:MM)
  duration: number; // smallint (minutes)
  created_at: string; // ISO timestamp string
}

/**
 * Legs table - Represents a leg of a trip (connection between flights)
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
 * Trips table - Represents a complete trip (collection of legs)
 */
export interface Trip {
  id: string; // Generated as: SHA-256 hash of sorted flight IDs joined by `|` (e.g., hash of "AA123_LAX_2024-01-15_14:30|BB456_JFK_2024-01-15_18:00")
  created_at: string; // ISO timestamp string
}

export interface SearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}

