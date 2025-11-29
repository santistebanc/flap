/**
 * Deal domain types
 */

import { FlightData } from '../../converters/flight/types';

export interface DealData {
  provider: string;
  price: number;
  link: string;
  flights: FlightData[];
  isRound: boolean;
  connectionTimes?: (string | null)[]; // Connection times from scraper (e.g., "7h 50", null for last leg)
}

