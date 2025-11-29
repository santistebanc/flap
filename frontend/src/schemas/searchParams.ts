import { z } from 'zod';

/**
 * Zod schema for search params validation
 * This ensures type safety and validation for URL search parameters
 */
export const searchParamsSchema = z.object({
  origin: z
    .string()
    .transform((val) => val.toUpperCase())
    .refine((val) => val.length === 3 || val === '', {
      message: 'Origin must be 3 characters',
    })
    .optional(),
  destination: z
    .string()
    .transform((val) => val.toUpperCase())
    .refine((val) => val.length === 3 || val === '', {
      message: 'Destination must be 3 characters',
    })
    .optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  roundTrip: z
    .union([z.boolean(), z.string(), z.literal('true'), z.literal('false')])
    .transform((val) => val === true || val === 'true')
    .optional()
    .default(false),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

/**
 * Zod schema for validating a complete search request
 * This is stricter than searchParamsSchema - all required fields must be present
 */
export const searchRequestSchema = z.object({
  origin: z
    .string()
    .min(3, 'Origin must be exactly 3 characters')
    .max(3, 'Origin must be exactly 3 characters')
    .transform((val) => val.toUpperCase()),
  destination: z
    .string()
    .min(3, 'Destination must be exactly 3 characters')
    .max(3, 'Destination must be exactly 3 characters')
    .transform((val) => val.toUpperCase()),
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Departure date must be in YYYY-MM-DD format'),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Return date must be in YYYY-MM-DD format')
    .optional(),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

/**
 * Validates and parses search params with defaults
 * Uses safeParse to handle validation errors gracefully
 */
export function parseSearchParams(search: Record<string, unknown>): SearchParams {
  const result = searchParamsSchema.safeParse(search);
  if (result.success) {
    return result.data;
  }
  // Return defaults if validation fails
  return {
    origin: undefined,
    destination: undefined,
    departureDate: undefined,
    returnDate: undefined,
    roundTrip: false,
  };
}

/**
 * Validates if search params form a valid search request
 * Returns the validated SearchRequest if valid, null otherwise
 */
export function validateSearchRequest(params: {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  roundTrip?: boolean;
}): SearchRequest | null {
  const request = {
    origin: params.origin,
    destination: params.destination,
    departureDate: params.departureDate,
    returnDate: params.roundTrip ? params.returnDate : undefined,
  };

  const result = searchRequestSchema.safeParse(request);
  return result.success ? result.data : null;
}

