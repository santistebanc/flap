/**
 * Extract flight data from a search_modal element (can contain outbound and return)
 * and save Flights, Trips, and Deals to the database
 */
import * as cheerio from 'cheerio';
import { SearchParams, Flight, ScraperTools } from '../../shared/types';
import { extractFlightFromSection } from './extract-from-section';
import { extractPricesFromSimilar } from './extract-prices';
import { createFlightsFromLegs } from '../helpers/create-flights';
import { findHeadings } from '../helpers/find-headings';
import { createLegsFromFlights } from '../helpers/create-legs-from-flights';
import { createTripFromFlights } from '../helpers/create-trip-from-flights';
import { createDealsFromPrices } from '../helpers/create-deals-from-prices';
import { generateTripId } from '../../../utils/ids';

export async function extractFlightFromSearchModal(
    $: cheerio.CheerioAPI,
    $el: cheerio.Cheerio<any>,
    params: SearchParams = {},
    tools: ScraperTools
): Promise<number> {
    // Find headings
    const { outboundHeading, returnHeading } = findHeadings($, $el);

    // Extract outbound flight
    const outboundFlight = extractFlightFromSection($, $el, outboundHeading, 'outbound');

    // If no outbound flight found, return null
    if (!outboundFlight) {
        return null;
    }

    // Extract return flight if present
    let returnFlight = null;
    if (returnHeading.length > 0) {
        returnFlight = extractFlightFromSection($, $el, returnHeading, 'return');
    }

    // Extract prices from _similar section (shared for both flights)
    const prices = extractPricesFromSimilar($, $el);

    // Use the first (lowest) price
    const priceValues = prices
        .map(p => {
            const numValue = parseFloat(p.price.replace(/,/g, ''));
            return { ...p, numValue };
        })
        .sort((a, b) => a.numValue - b.numValue)
        .map(p => p.price);

    const price = priceValues.length > 0 ? priceValues[0] : null;

    if (!price) {
        return null;
    }

    // Hardcoded: cabinclass is always Economy
    const cabinClass = 'Economy';
    const createdAt = new Date().toISOString();

    // Create Flight objects from legs and save using tools
    const outboundFlights: Flight[] = outboundFlight.legs
        ? await createFlightsFromLegs(outboundFlight.legs, outboundFlight.date, cabinClass, tools, createdAt)
        : [];

    const inboundFlights: Flight[] = returnFlight && returnFlight.legs
        ? await createFlightsFromLegs(returnFlight.legs, returnFlight.date, cabinClass, tools, createdAt)
        : [];

    // Generate trip ID first (needed for leg IDs) - use same generator as Redis
    const allFlightIds = [...outboundFlights, ...inboundFlights].map(f => f.id);
    const tripId = generateTripId(allFlightIds);

    // Create Leg objects with proper IDs and store them
    const outboundLegs = createLegsFromFlights(
        outboundFlights,
        tripId,
        false,
        outboundFlight.legs,
        createdAt
    );
    const inboundLegs = createLegsFromFlights(
        inboundFlights,
        tripId,
        true,
        returnFlight?.legs,
        createdAt
    );

    // Store all legs using tools
    for (const leg of outboundLegs) {
        await tools.addLeg(leg);
    }
    for (const leg of inboundLegs) {
        await tools.addLeg(leg);
    }

    // Create Trip object (minimal structure)
    const trip = createTripFromFlights(
        outboundFlights,
        inboundFlights,
        outboundLegs,
        inboundLegs,
        createdAt
    );
    await tools.addTrip(trip);

    // Create Deal objects for each price/provider - need to pass full structure
    const allLegs = [...outboundLegs, ...inboundLegs];
    const allFlights = [...outboundFlights, ...inboundFlights];
    const dealsCount = await createDealsFromPrices(
        prices,
        trip.id,
        'skyscanner', // source
        {
            origin: params.originplace || '',
            destination: params.destinationplace || '',
            departureDate: params.outbounddate || '',
            returnDate: params.inbounddate || undefined,
        },
        allLegs,
        allFlights,
        tools,
        createdAt
    );

    return dealsCount;
}
