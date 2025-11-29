/**
 * Extract a single leg from a panel body element
 * Creates Flight objects matching Redis structure exactly
 */
import * as cheerio from 'cheerio';
import { Flight, ScraperTools } from '../../shared/types';
import { parseTimeTo24Hour } from './parse-time';
import { generateFlightId } from '../../../utils/ids';
import { parseDurationToMinutes } from '../../../parsers/time';

export interface LegData {
    flight: string;
    connectionTime?: string;
}

export async function extractLegFromBody(
    $: cheerio.CheerioAPI,
    $body: cheerio.Cheerio<any>,
    currentSectionDate: string,
    tools: ScraperTools,
    flightsMap: Map<string, Flight>,
    createdAt?: string
): Promise<{ leg: LegData | null; nextSectionDate: string }> {
    const flightInfo = $body.find('div._head small').text().trim();

    // Extract airline and flight number (e.g., "Transavia France TO 4061")
    const flightMatch = flightInfo.match(/(.+?)\s+([A-Z0-9]{2})\s+(\d+)/);
    if (!flightMatch) {
        return { leg: null, nextSectionDate: currentSectionDate };
    }

    const airlineName = flightMatch[1].trim();
    const airlineCode = flightMatch[2];
    const flightNumber = `${airlineCode}${flightMatch[3]}`;

    // Extract times and airports
    const times = $body.find('div.c3 p').map((i, el) => $(el).text().trim()).get();
    const airports = $body.find('div.c4 p').map((i, el) => $(el).text().trim()).get();
    const durationStr = $body.find('div.c1 p').first().text().trim();

    if (times.length < 2 || airports.length < 2) {
        return { leg: null, nextSectionDate: currentSectionDate };
    }

    const departureTime = parseTimeTo24Hour(times[0]);
    const arrivalTime = parseTimeTo24Hour(times[1]);
    const originCode = airports[0].split(' ')[0];
    const destCode = airports[1].split(' ')[0];

    if (!departureTime || !arrivalTime || !originCode || !destCode) {
        return { leg: null, nextSectionDate: currentSectionDate };
    }

    // Determine arrival date (might be next day)
    let arrivalDate = currentSectionDate;
    const depHour = parseInt(departureTime.split(':')[0], 10);
    const arrHour = parseInt(arrivalTime.split(':')[0], 10);
    const depMin = parseInt(departureTime.split(':')[1], 10);
    const arrMin = parseInt(arrivalTime.split(':')[1], 10);

    if (arrHour < depHour || (arrHour === depHour && arrMin < depMin)) {
        // Arrival is next day
        const date = new Date(currentSectionDate);
        date.setDate(date.getDate() + 1);
        arrivalDate = date.toISOString().split('T')[0];
    }

    // Generate flight ID using the same generator as Redis
    const flightId = generateFlightId({
        flightNumber: flightNumber,
        origin: originCode,
        departureDate: currentSectionDate,
        departureTime: departureTime,
    });

    // Parse duration to minutes (number)
    const duration = parseDurationToMinutes(durationStr);
    const now = createdAt || new Date().toISOString();

    const flight: Flight = {
        id: flightId,
        flight_number: flightNumber,
        airline: airlineName,
        origin: originCode,
        destination: destCode,
        departure_date: currentSectionDate,
        departure_time: departureTime,
        arrival_date: arrivalDate,
        arrival_time: arrivalTime,
        duration: duration,
        created_at: now,
    };

    // Save flight to Redis using tools
    await tools.addFlight(flight);
    // Also store in map for lookups during deal creation
    flightsMap.set(flight.id, flight);

    // Extract connection time (from p.connect_airport within div._item)
    const $item = $body.find('div._item').first();
    const connectionTimeEl = $item.find('p.connect_airport');
    let connectionTime: string | undefined = undefined;
    if (connectionTimeEl.length > 0) {
        const connTimeText = connectionTimeEl.find('span').text().trim();
        if (connTimeText) {
            connectionTime = connTimeText;
        }
    }

    const leg: LegData = {
        flight: flight.id,
        connectionTime: connectionTime
    };

    return {
        leg,
        nextSectionDate: arrivalDate
    };
}

