/**
 * Extract flight from a section (outbound or return) - Kiwi specific
 * Extracts legs from HTML and creates Flight objects using tools
 */
import * as cheerio from 'cheerio';
import { SearchParams, ScraperTools, Flight } from '../../shared/types';
import { findPanelBetweenHeadings } from '../helpers/find-panel';
import { extractLegFromBody } from '../helpers/extract-leg-from-body';
import { extractSectionSummary } from '../helpers/extract-section-summary';

export async function extractFlightFromSection(
    $: cheerio.CheerioAPI,
    $searchModal: cheerio.Cheerio<any>,
    heading: cheerio.Cheerio<any>,
    direction: 'outbound' | 'return',
    params: SearchParams,
    tools: ScraperTools,
    flightsMap: Map<string, Flight>
): Promise<any> {
    if (heading.length === 0) {
        return null;
    }

    // Extract date from heading (e.g., "Sat, 22 Nov 2025")
    const headingText = heading.text();
    const dateMatch = headingText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
    if (!dateMatch) {
        return null;
    }

    const months: { [key: string]: string } = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };

    const day = dateMatch[1].padStart(2, '0');
    const month = months[dateMatch[2].toLowerCase()] || '01';
    const year = dateMatch[3];
    const sectionDate = `${year}-${month}-${day}`;

    // Find the search modal and panel
    const searchModal = heading.closest('div.search_modal');
    if (searchModal.length === 0) {
        console.warn(`[Kiwi] Could not find search_modal parent for ${direction} heading`);
        return null;
    }

    const panelInfo = findPanelBetweenHeadings($, heading, direction, searchModal);
    if (!panelInfo) {
        return null;
    }

    const { panel: firstPanel } = panelInfo;

    // Process only the first panel's bodies
    const panelBodies = firstPanel.find('div._panel_body');
    console.log(`[Kiwi] Found ${panelBodies.length} panel bodies in ${direction} section`);

    const legs: any[] = [];
    let currentSectionDate = sectionDate;
    let processedBodies = 0;

    // Convert to array and iterate with for loop to support async/await
    const bodyElements = panelBodies.toArray();
    for (let bodyIndex = 0; bodyIndex < bodyElements.length; bodyIndex++) {
        const bodyEl = bodyElements[bodyIndex];
        const $body = $(bodyEl);
        const bodyPanel = $body.closest('div._panel');

        if (bodyPanel.length === 0 || bodyPanel[0] !== firstPanel[0]) {
            console.warn(`[Kiwi] Skipping body ${bodyIndex} - not in our panel`);
            continue;
        }

        processedBodies++;
        const createdAt = new Date().toISOString();
        const { leg, nextSectionDate } = await extractLegFromBody($, $body, currentSectionDate, tools, flightsMap, createdAt);
        
        if (leg) {
            legs.push(leg);
            currentSectionDate = nextSectionDate;
        }
    }

    console.log(`[Kiwi] Processed ${processedBodies} bodies, extracted ${legs.length} legs for ${direction} section`);

    if (legs.length === 0) {
        console.warn(`[Kiwi] No legs extracted for ${direction} section`);
        return null;
    }

    // Extract summary from panel heading
    const summary = extractSectionSummary($, firstPanel);
    if (!summary) {
        return null;
    }

    return {
        legs: legs,
        origin: summary.origin,
        destination: summary.destination
    };
}

