/**
 * Main function to fetch Kiwi flights
 */
import { SearchParams, Leg, Trip, Deal, Flight, ScraperTools } from '../shared/types';
import { getRequest } from './http/get-request';
import { pollRequest } from './http/poll-request';
import { extractFlights } from './extractors/extract-flights';
import { generateLegId, generateTripId } from '../../utils/ids';
import { parseConnectionTimeToMinutes } from '../../parsers/time/parse-connection-time';

export async function fetchKiwi(params: SearchParams = {}, tools: ScraperTools): Promise<{ dealsCount: number; success: boolean; error?: string }> {
    try {

        // Step 1: Make initial GET request
        const initialResponse = await getRequest(params);

        if (!initialResponse.success) {
            return { dealsCount: 0, success: false, error: `Initial request failed: ${initialResponse.statusText}` };
        }

        if (!initialResponse.data || !initialResponse.data._token) {
            return { dealsCount: 0, success: false, error: 'Failed to extract data object or token from initial request' };
        }

        // Step 2: Make single poll request
        const pollResponse = await pollRequest(
            initialResponse.cookies,
            initialResponse.data,
            initialResponse.url || ''
        );

        if (!pollResponse.success) {
            return { dealsCount: 0, success: false, error: pollResponse.error || 'Poll request failed' };
        }

        // Step 3: Extract flights from poll response - tools will save directly to Redis
        const dealsCount = await extractFlights(pollResponse.body, params, tools);
        console.log(`[Kiwi] Extracted ${dealsCount} deals from HTML`);

        return { dealsCount, success: true };
    } catch (error) {
        console.error('[Kiwi] Error in fetchKiwi:', error);
        return {
            dealsCount: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

