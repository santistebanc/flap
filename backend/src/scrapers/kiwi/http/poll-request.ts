/**
 * Make poll request for Kiwi (single request)
 */
export async function pollRequest(cookies: string, data: any, refererUrl: string): Promise<{ success: boolean; body: string; error?: string }> {
    if (!data || !data._token) {
        return { success: false, body: '', error: 'Missing data object or token' };
    }

    // Build form data
    const formData = new URLSearchParams();
    formData.append('_token', data._token);
    formData.append('originplace', data.originplace || '');
    formData.append('destinationplace', data.destinationplace || '');
    formData.append('outbounddate', data.outbounddate || '');
    if (data.inbounddate) {
        formData.append('inbounddate', data.inbounddate);
    }
    formData.append('cabinclass', 'M'); // Always M
    formData.append('adults', data.adults || '1');
    formData.append('children', data.children || '0');
    formData.append('infants', data.infants || '0');
    formData.append('currency', 'EUR'); // Always EUR
    formData.append('type', data.type || 'return');
    formData.append('bags-cabin', data['bags-cabin'] || '0');
    formData.append('bags-checked', data['bags-checked'] || '0');

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en,de;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookies,
        'DNT': '1',
        'Origin': 'https://www.flightsfinder.com',
        'Referer': refererUrl,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'X-Requested-With': 'XMLHttpRequest',
    };

    try {
        console.log(`[Kiwi] Making POST request to: https://www.flightsfinder.com/portal/kiwi/search`);
        console.log(`[Kiwi] POST form data: ${formData.toString().substring(0, 100)}...`);
        const response = await fetch('https://www.flightsfinder.com/portal/kiwi/search', {
            method: 'POST',
            headers: headers,
            body: formData.toString()
        });

        console.log(`[Kiwi] POST response status: ${response.status} ${response.statusText}`);
        const body = await response.text();
        console.log(`[Kiwi] POST response body length: ${body.length} characters`);

        if (!response.ok) {
            console.error(`[Kiwi] POST request failed: HTTP ${response.status}: ${response.statusText}`);
            return { success: false, body, error: `HTTP ${response.status}: ${response.statusText}` };
        }

        return { success: true, body };
    } catch (error) {
        return {
            success: false,
            body: '',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

