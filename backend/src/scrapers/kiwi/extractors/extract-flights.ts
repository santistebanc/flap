/**
 * Extract flights from Kiwi response body
 */
import * as cheerio from 'cheerio';
import { SearchParams, ScraperTools } from '../../shared/types';
import { extractFlightFromSearchModal } from './extract-from-search-modal';

export async function extractFlights(body: string, params: SearchParams, tools: ScraperTools): Promise<number> {
    let dealsCount = 0;

    if (!body || body.trim().length === 0) {
        return 0;
    }

    try {
        const $ = cheerio.load(body);

        // Find all divs with class="list-item row" - each represents a flight deal
        const listItems = $('div.list-item.row');
        console.log(`[Kiwi] Found ${listItems.length} list-item.row elements in HTML`);

        if (listItems.length === 0) {
            return 0;
        }

        // Extract flight information from each list-item
        for (let index = 0; index < listItems.length; index++) {
            const $listItem = $(listItems[index]);
            // Find the search_modal within this list-item's modal
            const $searchModal = $listItem.find('div.modal div.search_modal').first();

            if ($searchModal.length === 0) {
                console.warn(`[Kiwi] List item ${index + 1} has no search_modal`);
                continue;
            }

            try {
                const count = await extractFlightFromSearchModal($, $searchModal, $listItem, params, tools);
                dealsCount += count;
                console.log(`[Kiwi] Successfully extracted flight ${index + 1}, deals: ${count}`);
            } catch (e) {
                console.error(`[Kiwi] Error extracting flight ${index + 1}:`, e);
            }
        }

    } catch (e) {
        console.error('[Kiwi] Error extracting flights:', e);
    }

    return dealsCount;
}

