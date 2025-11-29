/**
 * Make initial GET request to Kiwi
 */
import { SearchParams } from '../../shared/types';

export async function getRequest(params: SearchParams = {}) {
    const originplace = params.originplace || 'BER';
    const destinationplace = params.destinationplace || 'SLP';
    const outbounddate = params.outbounddate || '22/11/2025';
    const inbounddate = params.inbounddate || '';

    // Default values for Kiwi
    const currency = 'EUR'; // Always EUR
    const type = inbounddate ? 'return' : 'oneway';
    const cabinclass = 'M'; // Always M
    const adults = 1;
    const children = 0;
    const infants = 0;

    // Build URL with parameters
    const queryParams = new URLSearchParams({
        currency,
        type,
        cabinclass,
        originplace,
        destinationplace,
        outbounddate,
        ...(inbounddate && { inbounddate }),
        adults: adults.toString(),
        children: children.toString(),
        infants: infants.toString(),
    });

    const url = `https://www.flightsfinder.com/portal/kiwi?${queryParams.toString()}`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en,de;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'DNT': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
    };

    try {
        console.log(`[Kiwi] Making GET request to: ${url}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        console.log(`[Kiwi] GET response status: ${response.status} ${response.statusText}`);
        const result = await response.text();
        console.log(`[Kiwi] GET response body length: ${result.length} characters`);

        // Extract cookies from response headers
        const setCookieHeader = response.headers.get('set-cookie');
        let cookies = '';
        if (setCookieHeader) {
            const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
            cookies = cookieArray
                .map(cookie => {
                    const cookiePart = cookie.split(';')[0].trim();
                    return cookiePart;
                })
                .join('; ');
        }

        // Extract data object from response body
        let dataObject: any = null;

        const dataIndex = result.indexOf('data:');
        console.log(`[Kiwi] Looking for 'data:' in response, found at index: ${dataIndex !== -1 ? dataIndex : 'not found'}`);
        if (dataIndex !== -1) {
            let braceStart = result.indexOf('{', dataIndex);
            if (braceStart !== -1) {
                let braceCount = 0;
                let braceEnd = -1;
                for (let i = braceStart; i < result.length; i++) {
                    if (result[i] === '{') {
                        braceCount++;
                    } else if (result[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            braceEnd = i;
                            break;
                        }
                    }
                }

                if (braceEnd !== -1) {
                    const dataString = result.substring(braceStart, braceEnd + 1);
                    try {
                        const timestamp = Date.now();
                        let processedString = dataString.replace(/\$\.now\(\)/g, timestamp.toString());
                        processedString = processedString.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');
                        dataObject = JSON.parse(processedString);
                    } catch (e) {
                        try {
                            const timestamp = Date.now();
                            let processedString = dataString.replace(/\$\.now\(\)/g, timestamp.toString());
                            dataObject = new Function('return ' + processedString)();
                        } catch (evalError) {
                            console.error('[Kiwi] Failed to parse data object:', e);
                            dataObject = null;
                        }
                    }
                }
            }
        }

        console.log(`[Kiwi] Extracted data object:`, dataObject ? 'found' : 'not found');
        if (dataObject && dataObject._token) {
            console.log(`[Kiwi] Token extracted: ${dataObject._token.substring(0, 10)}...`);
        }

        return {
            status: response.status,
            statusText: response.statusText,
            body: result,
            cookies: cookies,
            data: dataObject,
            url: url,
            success: true
        };
    } catch (error) {
        return {
            status: 0,
            statusText: 'Error',
            body: error instanceof Error ? error.message : 'Unknown error',
            cookies: '',
            data: null,
            success: false
        };
    }
}

