/**
 * Extract prices from _similar section
 */
import * as cheerio from 'cheerio';

export function extractPricesFromSimilar($: cheerio.CheerioAPI, $el: cheerio.Cheerio<any>): Array<{ provider: string; price: string; link?: string }> {
    const prices: Array<{ provider: string; price: string; link?: string }> = [];

    // Structure: div._similar > div > p (provider name) + p (price with Select link)
    $el.find('div._similar > div').each((index, priceElement) => {
        const $priceEl = $(priceElement);
        const providerName = $priceEl.find('p').first().text().trim();
        const priceP = $priceEl.find('p').eq(1); // Second p contains the price
        const priceText = priceP.text().trim();

        // Extract reservation link from the "Select" button (a tag in the price p)
        // Get the substring starting at u=, then URL decode it
        const fullLink = priceP.find('a').attr('href');
        let selectLink: string | undefined = undefined;
        if (fullLink) {
            const uIndex = fullLink.indexOf('u=');
            if (uIndex !== -1) {
                // Extract substring starting at u=
                const uSubstring = fullLink.substring(uIndex + 2); // +2 to skip "u="
                // Extract until next & or end of string
                const endIndex = uSubstring.indexOf('&');
                const uValue = endIndex !== -1 ? uSubstring.substring(0, endIndex) : uSubstring;
                try {
                    selectLink = decodeURIComponent(uValue);
                } catch (e) {
                    // If decoding fails, use the original value
                    selectLink = uValue;
                }
            }
        }

        // Extract numeric price value, ignoring all non-numeric characters (currency symbols, etc.)
        // Matches: digits with optional thousands separators (comma or period) and optional decimal part
        // Examples: "€1,234.56" -> "1,234.56", "$500" -> "500", "£2,000" -> "2,000"
        const priceMatch = priceText.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
        if (priceMatch) {
            prices.push({
                provider: providerName,
                price: priceMatch[1],
                link: selectLink
            });
        }
    });

    return prices;
}

