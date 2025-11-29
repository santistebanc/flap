/**
 * Make initial GET request to Skyscanner
 */
import { SearchParams } from '../../shared/types';

export async function getRequest(params: SearchParams = {}) {
    // Default values
    const originplace = params.originplace || 'SLP';
    const destinationplace = params.destinationplace || 'BER';
    const outbounddate = params.outbounddate || '2026-01-19';
    const inbounddate = params.inbounddate || '';
    // Hardcoded: adults=1, children=0, infants=0, currency=EUR, cabinclass=Economy
    const adults = 1;
    const children = 0;
    const infants = 0;
    const currency = 'EUR';
    const cabinclass = 'Economy';

    // Build URL with parameters
    const queryParams = new URLSearchParams({
        originplace,
        destinationplace,
        outbounddate,
        inbounddate,
        cabinclass,
        adults: adults.toString(),
        children: children.toString(),
        infants: infants.toString(),
        currency
    });

    const url = `https://www.flightsfinder.com/portal/sky?${queryParams.toString()}`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    };

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        const result = await response.text();

        // Extract cookies from response headers
        const setCookieHeader = response.headers.get('set-cookie');
        let cookies = '';
        if (setCookieHeader) {
            // Parse Set-Cookie header(s) - can be an array or comma-separated
            const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
            cookies = cookieArray
                .map(cookie => {
                    // Extract cookie name and value (before first semicolon)
                    const cookiePart = cookie.split(';')[0].trim();
                    return cookiePart;
                })
                .join('; ');
        }

        // Extract data object from response body
        // Look for data: { ... } pattern - handle nested braces properly
        let dataObject: any = null;

        const dataIndex = result.indexOf('data:');
        if (dataIndex !== -1) {
            // Find the opening brace after "data:"
            let braceStart = result.indexOf('{', dataIndex);
            if (braceStart !== -1) {
                // Find the matching closing brace by counting braces
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
                    // Extract the data object string
                    const dataString = result.substring(braceStart, braceEnd + 1);
                    try {
                        // More careful replacement: only replace single quotes that are property names or string values
                        // First, handle $.now() - replace with current timestamp
                        const timestamp = Date.now();
                        let processedString = dataString.replace(/\$\.now\(\)/g, timestamp.toString());

                        // Replace single quotes with double quotes, but be careful about escaped quotes
                        // This regex handles: 'key': 'value' patterns
                        processedString = processedString.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');

                        dataObject = JSON.parse(processedString);
                    } catch (e) {
                        // If JSON parsing fails, try using eval (less safe but handles JS object notation)
                        try {
                            const timestamp = Date.now();
                            let processedString = dataString.replace(/\$\.now\(\)/g, timestamp.toString());
                            // Use Function constructor to safely evaluate the object
                            dataObject = new Function('return ' + processedString)();
                        } catch (evalError) {
                            console.error('Failed to parse data object:', e);
                            console.error('Eval also failed:', evalError);
                            dataObject = null;
                        }
                    }
                }
            }
        }

        return {
            status: response.status,
            statusText: response.statusText,
            body: result,
            cookies: cookies,
            data: dataObject,
            url: url, // Return the URL used for the request (for referer in poll requests)
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

