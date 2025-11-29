/**
 * Extract flights from HTML response body
 */
import * as cheerio from 'cheerio';
import { SearchParams, ScraperTools } from '../../shared/types';
import { extractFlightFromSearchModal } from './extract-from-search-modal';

export async function extractFlights(body: string, params: SearchParams = {}, tools: ScraperTools): Promise<number> {
    if (!body || body.trim().length === 0) {
        console.log('Empty body provided to extractFlights');
        return 0;
    }

    let dealsCount = 0;

    try {
        // Load HTML with cheerio
        const $ = cheerio.load(body);

        // Find all divs with class="search_modal" - one per flight route
        const searchModals = $('div.search_modal');

        console.log('Found search_modal elements:', searchModals.length);

        if (searchModals.length === 0) {
            // Try to see if there's any HTML structure at all
            const allDivs = $('div');
            console.log('Total div elements found:', allDivs.length);
            if (allDivs.length > 0) {
                console.log('First div classes:', allDivs.first().attr('class'));
            }
            return 0;
        }

        // Extract flight information from each search_modal and save using tools
        for (let index = 0; index < searchModals.length; index++) {
            const $searchModal = $(searchModals[index]);
            try {
                const count = await extractFlightFromSearchModal($, $searchModal, params, tools);
                dealsCount += count;
                console.log(`Successfully extracted flight ${index + 1}, deals: ${count}`);
            } catch (e) {
                console.error(`Error extracting flight ${index + 1}:`, e);
            }
        }

    } catch (e) {
        console.error('Error extracting flights:', e);
        if (e instanceof Error) {
            console.error('Error stack:', e.stack);
        }
    }

    return dealsCount;
}

