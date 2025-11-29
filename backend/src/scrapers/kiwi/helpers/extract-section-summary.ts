/**
 * Extract summary information from a panel heading
 */
import * as cheerio from 'cheerio';

export interface SectionSummary {
    origin: string;
    destination: string;
}

export function extractSectionSummary(
    $: cheerio.CheerioAPI,
    panel: cheerio.Cheerio<any>
): SectionSummary | null {
    // Extract origin and destination from trip summary in _panel_heading
    const panelHeading = panel.find('div._panel_heading').first();
    const trip = panelHeading.find('div.trip');
    const tripTimes = trip.find('p.time span').map((i, el) => $(el).text().trim()).get();
    const originCode = tripTimes[0] || '';
    const destCode = tripTimes[tripTimes.length - 1] || '';

    if (!originCode || !destCode) {
        return null;
    }

    return {
        origin: originCode,
        destination: destCode
    };
}

