export interface Deal {
  id: string;
  trip: string;
  origin: string;
  destination: string;
  stop_count: number;
  duration: number;
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

export interface SearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}

export interface SearchResult {
  tripId: string;
  deals: Deal[];
  flights: Flight[];
}

