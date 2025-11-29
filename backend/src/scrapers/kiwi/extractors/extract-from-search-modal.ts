/**
 * Extract flight data from a search_modal - Kiwi specific
 */
import * as cheerio from 'cheerio';
import { SearchParams, ScraperTools, Leg, Trip, Deal, Flight } from '../../shared/types';
import { extractFlightFromSection } from './extract-from-section';
import { generateLegId, generateTripId, generateDealId } from '../../../utils/ids';
import { parseConnectionTimeToMinutes } from '../../../parsers/time';
import { convertKiwiDateToISO } from '../../../parsers/date';

export async function extractFlightFromSearchModal(
    $: cheerio.CheerioAPI,
    $searchModal: cheerio.Cheerio<any>,
    $listItem: cheerio.Cheerio<any>,
    params: SearchParams,
    tools: ScraperTools
): Promise<number> {
    // Extract price from data-price attribute (in cents)
    const dataPrice = $listItem.attr('data-price');
    let price = '';
    if (dataPrice) {
        const priceInCents = parseInt(dataPrice, 10);
        price = (priceInCents / 100).toString();
    } else {
        // Fallback to price element
        const priceText = $listItem.find('p.prices').first().text().trim();
        const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
        if (priceMatch) {
            price = priceMatch[1].replace(/,/g, '');
        }
    }

    if (!price) {
        console.warn(`[Kiwi] No price found in list item`);
        return 0;
    }

    // Extract booking link
    const bookingLink = $listItem.find('a.modal_responsive').first().attr('href') || '';

    // Find headings within the search_modal
    const headings = $searchModal.find('p._heading');
    const outboundHeading = headings.filter((i, el) => {
        const text = $(el).text();
        return text.includes('Outbound') && !text.includes('Return');
    }).first();

    const returnHeading = headings.filter((i, el) => {
        const text = $(el).text();
        return text.includes('Return');
    }).first();

    // Temporary map to track flights during extraction (for lookups when creating deals)
    const flightsMap = new Map<string, Flight>();
    
    const outboundFlight = await extractFlightFromSection($, $searchModal, outboundHeading, 'outbound', params, tools, flightsMap);

    if (!outboundFlight) {
        console.warn(`[Kiwi] Failed to extract outbound flight from section`);
        return 0;
    }

    // Only extract return flight if return date is provided in params
    let returnFlight = null;
    if (params.inbounddate && params.inbounddate.trim() !== '' && returnHeading.length > 0) {
        returnFlight = await extractFlightFromSection($, $searchModal, returnHeading, 'return', params, tools, flightsMap);
    }

    // Get flight IDs from legs
    const outboundFlightIds = outboundFlight.legs.map((leg: any) => leg.flight);
    const inboundFlightIds = returnFlight && returnFlight.legs
        ? returnFlight.legs.map((leg: any) => leg.flight)
        : [];
    const allFlightIds = [...outboundFlightIds, ...inboundFlightIds];

    // Generate trip ID using the same generator as Redis
    const tripId = generateTripId(allFlightIds);
    const createdAt = new Date().toISOString();
    
    // Get all flights for this trip
    const allFlights: Flight[] = [];
    for (const flightId of allFlightIds) {
        const flight = flightsMap.get(flightId);
        if (flight) {
            allFlights.push(flight);
        }
    }

    // Create Leg entities with proper structure
    const outboundLegs: Leg[] = outboundFlight.legs.map((leg: any, legIndex: number) => {
        const legId = generateLegId(tripId, leg.flight, false);
        let connectionTime: number | null = null;
        if (leg.connectionTime) {
            connectionTime = parseConnectionTimeToMinutes(leg.connectionTime);
        }
        return {
            id: legId,
            trip: tripId,
            flight: leg.flight,
            inbound: false,
            order: legIndex,
            connection_time: connectionTime,
            created_at: createdAt,
        };
    });

    const inboundLegs: Leg[] = returnFlight && returnFlight.legs
        ? returnFlight.legs.map((leg: any, legIndex: number) => {
            const legId = generateLegId(tripId, leg.flight, true);
            let connectionTime: number | null = null;
            if (leg.connectionTime) {
                connectionTime = parseConnectionTimeToMinutes(leg.connectionTime);
            }
            return {
                id: legId,
                trip: tripId,
                flight: leg.flight,
                inbound: true,
                order: legIndex,
                connection_time: connectionTime,
                created_at: createdAt,
            };
        })
        : [];

    // Store all legs using tools
    for (const leg of outboundLegs) {
        await tools.addLeg(leg);
    }
    for (const leg of inboundLegs) {
        await tools.addLeg(leg);
    }

    // Create Trip object (minimal structure)
    const trip: Trip = {
        id: tripId,
        created_at: createdAt,
    };

    await tools.addTrip(trip);

    // Get deal properties
    const firstFlight = allFlights[0];
    const lastFlight = allFlights[allFlights.length - 1];
    
    // Get origin/destination from params
    const origin = params.originplace || '';
    const destination = params.destinationplace || '';
    // Convert dates from DD/MM/YYYY (Kiwi format) to YYYY-MM-DD (ISO format) for storage
    const departureDate = params.outbounddate ? convertKiwiDateToISO(params.outbounddate) : '';
    const returnDate = params.inbounddate ? convertKiwiDateToISO(params.inbounddate) : undefined;
    
    const dealId = generateDealId(tripId, 'kiwi', 'kiwi');
    const deal: Deal = {
        id: dealId,
        trip: tripId,
        origin: origin,
        destination: destination,
        is_round: inboundLegs.length > 0,
        departure_date: departureDate,
        departure_time: firstFlight?.departure_time || '',
        return_date: returnDate || null,
        return_time: returnDate && lastFlight && inboundLegs.length > 0 ? lastFlight.arrival_time : null,
        source: 'kiwi',
        provider: 'kiwi',
        price: parseFloat(price.replace(/,/g, '')),
        link: bookingLink || '',
        created_at: createdAt,
        updated_at: createdAt,
    };

    await tools.addDeal(deal);
    
    return 1; // One deal per flight extraction
}

