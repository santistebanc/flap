/**
 * Create Flight objects from leg data
 * Creates Flight objects matching Redis structure exactly
 */
import { Flight, ScraperTools } from '../../shared/types';
import { convertDateToYYYYMMDD } from './parse-date';
import { parseTimeTo24Hour } from './parse-time';
import { generateFlightId } from '../../../utils/ids';
import { parseDurationToMinutes } from '../../../parsers/time';

export async function createFlightsFromLegs(
    legs: any[],
    sectionDate: string | null,
    cabinClass: string,
    tools: ScraperTools,
    createdAt?: string
): Promise<Flight[]> {
    const flights: Flight[] = [];
    const sectionDateYYYYMMDD = convertDateToYYYYMMDD(sectionDate);
    const now = createdAt || new Date().toISOString();

    for (const leg of legs) {
        if (!leg.flightNumber || !leg.departure || !leg.origin || !leg.destination) {
            continue;
        }

        const departureTime = parseTimeTo24Hour(leg.departure);
        const arrivalTime = parseTimeTo24Hour(leg.arrival);

        if (!departureTime || !sectionDateYYYYMMDD) {
            continue;
        }

        // Use arrival date if provided, otherwise use departure date
        let arrivalDate = sectionDateYYYYMMDD;
        if (leg.arrivalDate) {
            const convertedArrivalDate = convertDateToYYYYMMDD(leg.arrivalDate);
            if (convertedArrivalDate) {
                arrivalDate = convertedArrivalDate;
            }
        }

        const finalArrivalTime = arrivalTime || departureTime; // Fallback to departure time if arrival time missing

        // Generate flight ID using the same generator as Redis
        const flightId = generateFlightId({
            flightNumber: leg.flightNumber,
            origin: leg.origin,
            departureDate: sectionDateYYYYMMDD,
            departureTime: departureTime,
        });

        // Parse duration to minutes (number)
        const duration = parseDurationToMinutes(leg.duration);

        const flight: Flight = {
            id: flightId,
            flight_number: leg.flightNumber,
            airline: leg.airline || '',
            origin: leg.origin,
            destination: leg.destination,
            departure_date: sectionDateYYYYMMDD,
            departure_time: departureTime,
            arrival_date: arrivalDate,
            arrival_time: finalArrivalTime,
            duration: duration,
            created_at: now,
        };

        await tools.addFlight(flight);
        flights.push(flight);
    }

    return flights;
}

