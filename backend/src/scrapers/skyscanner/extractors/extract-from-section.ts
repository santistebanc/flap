/**
 * Extract flight data from a section (outbound or return)
 */
import * as cheerio from 'cheerio';
import { extractPanelHeading } from '../helpers/extract-panel-heading';
import { extractLegFromElement } from '../helpers/extract-leg-from-element';

export function extractFlightFromSection($: cheerio.CheerioAPI, $el: cheerio.Cheerio<any>, heading: cheerio.Cheerio<any>, type: 'outbound' | 'return'): any {
    if (heading.length === 0) {
        return null;
    }

    // Extract date from heading
    const dateText = heading.text();
    const dateMatch = dateText.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})/);
    const date = dateMatch ? `${dateMatch[2]} ${dateMatch[3]} ${dateMatch[4]}` : null;

    // Find the panel that comes immediately after this heading as a sibling
    // The structure is: p._heading followed by div._panel
    // Both are children of search_modal, so we need to find the next sibling
    const panel = heading.nextAll('div._panel').first();

    if (panel.length === 0) {
        return null;
    }

    // Extract overall flight info from panel_heading
    const headingInfo = extractPanelHeading($, panel);
    if (!headingInfo) {
        return null;
    }

    // Extract all legs from _panel_body sections within this panel
    const legs: any[] = [];
    panel.find('div._panel_body').each((index, legElement) => {
        const $leg = $(legElement);
        const leg = extractLegFromElement($, $leg);
        if (leg) {
            legs.push(leg);
        }
    });

    return {
        date: date,
        departure: headingInfo.departureTime,
        arrival: headingInfo.arrivalTime,
        origin: headingInfo.departureAirport,
        destination: headingInfo.arrivalAirport,
        airline: headingInfo.airlineName || headingInfo.flightName || null,
        flightName: headingInfo.flightName || null,
        legs: legs.length > 0 ? legs : undefined,
    };
}

