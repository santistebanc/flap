/**
 * Zod schemas for API response validation
 */
import { z } from 'zod';

// Job status schema
const jobStatusSchema = z.object({
  jobId: z.string(),
  status: z.enum(['pending', 'active', 'completed', 'failed']),
  searchId: z.string().optional(),
  resultCount: z.number().optional(),
  lastFetchedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

// Airport schema
const airportSchema = z.object({
  code: z.string(),
  name: z.string(),
});

// DateTime schema
const dateTimeSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  time: z.string(), // HH:MM
});

// Airline schema
const airlineSchema = z.object({
  name: z.string(),
});

// SearchResultLeg schema
const searchResultLegSchema = z.object({
  legId: z.string(),
  flightId: z.string(),
  flightNumber: z.string(),
  origin: airportSchema,
  destination: airportSchema,
  departure: dateTimeSchema,
  arrival: dateTimeSchema,
  duration: z.string(),
  airline: airlineSchema,
  cabinClass: z.string(),
  connectionTime: z.string().optional(),
});

// Deal schema (for SearchResult)
const dealSchema = z.object({
  dealId: z.string(),
  price: z.string(),
  provider: z.string(),
  link: z.string().optional(),
  last_update: z.string(),
});

// SearchResult schema
export const searchResultSchema = z.object({
  tripId: z.string(),
  origin: airportSchema,
  destination: airportSchema,
  outboundLegs: z.array(searchResultLegSchema),
  inboundLegs: z.array(searchResultLegSchema),
  deals: z.array(dealSchema),
});

// Search results schema
export const searchResultsSchema = z.object({
  searchId: z.string(),
  results: z.array(searchResultSchema),
});

// Fetch source response schema
export const fetchSourceResponseSchema = z.object({
  searchId: z.string(),
  status: z.string(),
  job: z.object({
    jobId: z.string(),
    status: z.string(),
    searchId: z.string().optional(),
  }),
});

// Clear data response schema
export const clearDataResponseSchema = z.object({
  success: z.boolean(),
  deleted: z.number(),
  message: z.string(),
});

