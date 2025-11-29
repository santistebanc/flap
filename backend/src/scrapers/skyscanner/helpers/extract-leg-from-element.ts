/**
 * Extract a single leg from a panel body element
 */
import * as cheerio from 'cheerio';

export interface LegData {
    flightNumber: string | null;
    airline: string | null;
    departure: string;
    arrival: string;
    origin: string;
    destination: string;
    originFull: string;
    destinationFull: string;
    duration: string | null;
    connectionTime: string | null;
    arrivalDate: string | null;
}

export function extractLegFromElement(
    $: cheerio.CheerioAPI,
    $leg: cheerio.Cheerio<any>
): LegData | null {
    // Extract flight number and airline from small tag in div._head
    // Format: "AirlineName FlightNumber" - split by spaces, last item is flight number
    const flightInfoText = $leg.find('div._head small').first().text().trim();
    const flightInfoParts = flightInfoText.split(/\s+/);
    const flightNumber = flightInfoParts.length > 0 ? flightInfoParts[flightInfoParts.length - 1] : null;
    const airlineNameLeg = flightInfoParts.length > 1 ? flightInfoParts.slice(0, -1).join(' ') : null;

    // Extract duration from div.c1 > p
    const legDuration = $leg.find('div.c1 p').first().text().trim();

    // Extract times from div.c3 > p (first is departure, last is arrival)
    const timesEl = $leg.find('div.c3');
    const departureTimeLeg = timesEl.find('p').first().text().trim();
    const arrivalTimeLeg = timesEl.find('p').last().text().trim();

    // Extract airports from div.c4 > p (first is origin, last is destination)
    const airportsEl = $leg.find('div.c4');
    const originAirportFull = airportsEl.find('p').first().text().trim();
    const destinationAirportFull = airportsEl.find('p').last().text().trim();

    // Extract airport codes (3-letter codes at the start of the full name)
    const originCodeMatch = originAirportFull.match(/^([A-Z]{3})\s/);
    const destinationCodeMatch = destinationAirportFull.match(/^([A-Z]{3})\s/);
    const originCode = originCodeMatch ? originCodeMatch[1] : null;
    const destinationCode = destinationCodeMatch ? destinationCodeMatch[1] : null;

    // Extract connection time if present (p.connect_airport > span)
    const connectEl = $leg.find('p.connect_airport');
    const connectionTime = connectEl.length > 0 ? connectEl.find('span').first().text().trim() : null;

    // Extract arrival date if present in summary (p._summary > span, first span)
    // Only the last leg typically has this
    const summaryEl = $leg.find('p._summary');
    let arrivalDateText = null;
    if (summaryEl.length > 0) {
        // Look for date pattern in the summary
        const summaryText = summaryEl.text();
        const dateMatch = summaryText.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})/);
        if (dateMatch) {
            arrivalDateText = `${dateMatch[1]}, ${dateMatch[2]} ${dateMatch[3]} ${dateMatch[4]}`;
        }
    }

    // Only return leg if we have essential information
    if (!departureTimeLeg || !arrivalTimeLeg || !originCode || !destinationCode) {
        return null;
    }

    return {
        flightNumber: flightNumber || null,
        airline: airlineNameLeg || null,
        departure: departureTimeLeg,
        arrival: arrivalTimeLeg,
        origin: originCode,
        destination: destinationCode,
        originFull: originAirportFull,
        destinationFull: destinationAirportFull,
        duration: legDuration || null,
        connectionTime: connectionTime || null,
        arrivalDate: arrivalDateText || null,
    };
}

