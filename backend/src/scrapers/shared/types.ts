/**
 * Shared types for all scrapers
 * Re-exports core types from the main types file
 */

import { Flight, Leg, Trip, Deal } from '../../types';

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

// Re-export types for convenience
export type { Flight, Leg, Trip, Deal };