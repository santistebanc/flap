/**
 * Find outbound and return headings in a search modal
 */
import * as cheerio from 'cheerio';

export interface Headings {
    outboundHeading: cheerio.Cheerio<any>;
    returnHeading: cheerio.Cheerio<any>;
}

export function findHeadings(
    $: cheerio.CheerioAPI,
    $el: cheerio.Cheerio<any>
): Headings {
    // Find all headings to determine if there's outbound and return
    // Headings are direct children or descendants of search_modal
    const headings = $el.find('p._heading');
    const outboundHeading = headings.filter((i, el) => {
        const text = $(el).text();
        return text.includes('Outbound') && !text.includes('Return') && !text.includes('Book Your Ticket');
    }).first();
    const returnHeading = headings.filter((i, el) => {
        const text = $(el).text();
        return text.includes('Return') && !text.includes('Book Your Ticket');
    }).first();

    return {
        outboundHeading,
        returnHeading
    };
}

