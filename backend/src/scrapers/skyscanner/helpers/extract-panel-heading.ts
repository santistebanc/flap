/**
 * Extract overall flight information from panel heading
 */
import * as cheerio from 'cheerio';

export interface PanelHeadingInfo {
    airlineName: string;
    flightName: string;
    departureTime: string;
    departureAirport: string;
    arrivalTime: string;
    arrivalAirport: string;
}

export function extractPanelHeading(
    $: cheerio.CheerioAPI,
    panel: cheerio.Cheerio<any>
): PanelHeadingInfo | null {
    // Extract overall flight info from panel_heading
    const panelHeading = panel.find('div._panel_heading').first();

    // Extract airline name from p._ahn
    const airlineName = panelHeading.find('p._ahn').first().text().trim();

    // Extract flight name (may include multiple airlines) from p._flight_name
    const flightName = panelHeading.find('p._flight_name').first().text().trim();

    // Extract departure time and airport from trip section
    const tripSection = panelHeading.find('div.trip').first();
    const departureTimeEl = tripSection.find('p.time').first();
    // Get time text without the airport code span
    const departureTime = departureTimeEl.clone().children().remove().end().text().trim();
    const departureAirport = departureTimeEl.find('span').first().text().trim();

    // Extract arrival time and airport (last p.time in trip section)
    const arrivalTimeEl = tripSection.find('p.time').last();
    // Get time text without the airport code span and superscript
    const arrivalTime = arrivalTimeEl.clone().children().remove().end().text().trim();
    const arrivalAirport = arrivalTimeEl.find('span').first().text().trim();

    if (!departureTime || !arrivalTime || !departureAirport || !arrivalAirport) {
        return null;
    }

    return {
        airlineName,
        flightName,
        departureTime,
        departureAirport,
        arrivalTime,
        arrivalAirport
    };
}

