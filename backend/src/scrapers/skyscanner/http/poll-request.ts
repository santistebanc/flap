/**
 * Make poll request to Skyscanner
 */
import { SearchParams, ScraperTools } from '../../shared/types';
import { extractFlights } from '../extractors/extract-flights';

export async function pollRequest(
    data: any,
    cookies: string = '',
    refererUrl: string | undefined,
    params: SearchParams,
    tools: ScraperTools
) {
    const url = 'https://www.flightsfinder.com/portal/sky/poll';

    const headers: { [key: string]: string } = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    };

    // Add cookies if provided
    if (cookies) {
        headers['cookie'] = cookies;
    }

    // Build the form data from the data object as-is
    if (!data || !data['_token']) {
        throw new Error('Invalid data object: _token is required');
    }

    // Update 'noc' parameter with current timestamp (browser updates this on each poll)
    const dataWithUpdatedNoc = { ...data };
    dataWithUpdatedNoc['noc'] = Date.now().toString();

    // Build URL-encoded form data directly from the data object
    const requestBody = Object.entries(dataWithUpdatedNoc)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: requestBody
        });

        const responseText = await response.text();

        // Extract cookies from response headers and merge with existing cookies
        const setCookieHeader = response.headers.get('set-cookie');
        let updatedCookies = cookies;
        if (setCookieHeader) {
            const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
            const newCookies = cookieArray
                .map(cookie => {
                    const cookiePart = cookie.split(';')[0].trim();
                    return cookiePart;
                })
                .join('; ');

            // Merge with existing cookies
            if (newCookies) {
                if (updatedCookies) {
                    const existingCookieMap = new Map<string, string>();
                    updatedCookies.split(';').forEach(c => {
                        const [name, ...valueParts] = c.trim().split('=');
                        if (name) {
                            existingCookieMap.set(name, valueParts.join('='));
                        }
                    });

                    newCookies.split(';').forEach(c => {
                        const [name, ...valueParts] = c.trim().split('=');
                        if (name) {
                            existingCookieMap.set(name, valueParts.join('='));
                        }
                    });

                    updatedCookies = Array.from(existingCookieMap.entries())
                        .map(([name, value]) => `${name}=${value}`)
                        .join('; ');
                } else {
                    updatedCookies = newCookies;
                }
            }
        }

        // Check for 504 Gateway Time-out or other error pages
        if (response.status === 504 || responseText.includes('504 Gateway Time-out') || responseText.includes('<title>504 Gateway Time-out</title>')) {
            console.warn('504 Gateway Time-out received, treating as non-finished poll');
            return {
                status: response.status,
                statusText: '504 Gateway Time-out',
                finished: false,
                count: 0,
                body: '',
                dealsCount: 0,
                cookies: updatedCookies,
                success: true
            };
        }

        // Check for Page Not Found errors
        if (response.status === 404 || responseText.includes('Page Not Found') || responseText.includes('<title>Page Not Found')) {
            console.warn('Page Not Found received, treating as non-finished poll');
            return {
                status: response.status || 404,
                statusText: 'Page Not Found',
                finished: false,
                count: 0,
                body: '',
                dealsCount: 0,
                cookies: updatedCookies,
                success: true
            };
        }

        // Split the response by '|'
        const parts = responseText.split('|');

        // Extract finished: true if first item is 'Y', false if 'N'
        const finished = parts.length > 0 && parts[0] === 'Y';

        // Extract count: number from second item
        const count = parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;

        // Extract body: string from seventh item (index 6)
        let body = parts.length > 6 ? parts[6] : '';

        // Try URL decoding if the body looks encoded
        if (body && body.includes('%')) {
            try {
                body = decodeURIComponent(body);
            } catch (e) {
                console.log('URL decoding failed, using original body');
            }
        }

        // Only extract flights if finished is true (Y)
        let dealsCount = 0;
        if (finished) {
            console.log('Finished is Y, extracting flights...');
            dealsCount = await extractFlights(body, params, tools);
            console.log('Extracted deals count:', dealsCount);
        } else {
            console.log('Finished is N, skipping flight extraction');
        }

        return {
            status: response.status,
            statusText: response.statusText,
            finished: finished,
            count: count,
            body: body,
            dealsCount: dealsCount,
            cookies: updatedCookies,
            success: true
        };
    } catch (error) {
        return {
            status: 0,
            statusText: 'Error',
            finished: false,
            count: 0,
            body: error instanceof Error ? error.message : 'Unknown error',
            dealsCount: 0,
            cookies: cookies,
            success: false
        };
    }
}

