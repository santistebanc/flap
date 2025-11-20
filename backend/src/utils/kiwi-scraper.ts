import * as cheerio from 'cheerio';
import { EventEmitter } from 'events';

// Reuse the same interfaces from skyscanner-scraper
export interface SearchParams {
    originplace?: string;
    destinationplace?: string;
    outbounddate?: string;
    inbounddate?: string;
}

export interface DateTime {
    date: string; // YYYY-MM-DD
    time: string; // 24 hour format
}

export interface Airport {
    code: string;
    name: string;
}

export interface Airline {
    name: string;
}

export interface Flight {
    id: string;
    flightNumber: string;
    origin: Airport;
    destination: Airport;
    departure: DateTime;
    arrival: DateTime;
    duration: string;
    airline: Airline;
    cabinClass: string;
}

export interface Leg {
    flight: string;
    connectionTime?: string;
}

export interface Trip {
    id: string;
    duration: string;
    origin: Airport;
    destination: Airport;
    stopCount: number;
    outboundLegs: Leg[];
    inboundLegs: Leg[];
}

export interface Deal {
    trip: string;
    price: string;
    provider: string;
    link?: string;
    last_update: string;
}

// In-memory database (same as Skyscanner)
class InMemoryDB extends EventEmitter {
    flights: Map<string, Flight> = new Map();
    trips: Map<string, Trip> = new Map();
    deals: Map<string, Deal> = new Map();
    
    generateFlightId(flightNumber: string, departure: DateTime): string {
        return `${flightNumber}_${departure.date}_${departure.time}`;
    }
    
    generateTripId(outboundLegs: Leg[], inboundLegs: Leg[]): string {
        const allFlightIds = [
            ...outboundLegs.map(l => l.flight),
            ...inboundLegs.map(l => l.flight)
        ].sort().join('|');
        return Buffer.from(allFlightIds).toString('base64').replace(/[/+=]/g, '').substring(0, 64);
    }
    
    generateDealId(tripId: string, provider: string): string {
        return `${tripId}_${provider}`;
    }
    
    addFlight(flight: Flight): void {
        const isNew = !this.flights.has(flight.id);
        this.flights.set(flight.id, flight);
        if (isNew) {
            this.emit('flight:added', flight);
        }
    }
    
    addTrip(trip: Trip): void {
        const isNew = !this.trips.has(trip.id);
        this.trips.set(trip.id, trip);
        if (isNew) {
            this.emit('trip:added', trip);
        }
    }
    
    addDeal(deal: Deal): void {
        const isNew = !this.deals.has(deal.trip);
        this.deals.set(deal.trip, deal);
        if (isNew) {
            this.emit('deal:added', deal);
        }
    }
    
    getAllTripsWithDeals(): Array<{ trip: Trip; deals: Deal[] }> {
        const result: Array<{ trip: Trip; deals: Deal[] }> = [];
        this.trips.forEach(trip => {
            const tripDeals = Array.from(this.deals.values()).filter(d => d.trip === trip.id);
            if (tripDeals.length > 0) {
                result.push({ trip, deals: tripDeals });
            }
        });
        return result;
    }
    
    getAllFlights(): Flight[] {
        return Array.from(this.flights.values());
    }
    
    clear(): void {
        this.flights.clear();
        this.trips.clear();
        this.deals.clear();
    }
}

export const db = new InMemoryDB();

// Helper function to convert DD/MM/YYYY to YYYY-MM-DD
function parseDateToISO(dateStr: string): string {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return dateStr;
}

// Helper function to parse time to 24-hour format
function parseTimeTo24Hour(timeStr: string | null): string | null {
    if (!timeStr) return null;
    const cleaned = timeStr.trim();
    
    // If already in 24-hour format (HH:MM), return as is
    if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
        const [hours, minutes] = cleaned.split(':');
        return `${hours.padStart(2, '0')}:${minutes}`;
    }
    
    // Try to parse 12-hour format (e.g., "10:30 AM" or "2:45 PM")
    const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2];
        const period = timeMatch[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    return null;
}

// Function to make initial GET request for Kiwi
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
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        const result = await response.text();

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
                            console.error('Failed to parse data object:', e);
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

// Function to make poll request for Kiwi (single request)
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
        const response = await fetch('https://www.flightsfinder.com/portal/kiwi/search', {
            method: 'POST',
            headers: headers,
            body: formData.toString()
        });

        const body = await response.text();

        if (!response.ok) {
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

// Function to extract flights from Kiwi response body
function extractFlights(body: string, params: SearchParams = {}): any[] {
    const flights: any[] = [];

    if (!body || body.trim().length === 0) {
        return [];
    }

    try {
        const $ = cheerio.load(body);

        // Find all divs with class="list-item row" - each represents a flight deal
        const listItems = $('div.list-item.row');
        
        if (listItems.length === 0) {
            return [];
        }

        // Extract flight information from each list-item
        listItems.each((index, element) => {
            const $listItem = $(element);
            // Find the search_modal within this list-item's modal
            // The modal structure is: div.list-item > div.modal > div.modal-dialog > div.modal-content > div.modal-body > div.search_modal
            const $searchModal = $listItem.find('div.modal div.search_modal').first();
            
            if ($searchModal.length === 0) {
                return;
            }
            
            try {
                const flight = extractFlightFromSearchModal($, $searchModal, $listItem, params);
                if (flight && flight.price) {
                    flights.push(flight);
                }
            } catch (e) {
                console.error(`[Kiwi] Error extracting flight ${index + 1}:`, e);
            }
        });

    } catch (e) {
        console.error('[Kiwi] Error extracting flights:', e);
    }

    return flights;
}

// Helper function to extract flight data from a search_modal
function extractFlightFromSearchModal($: cheerio.CheerioAPI, $searchModal: cheerio.Cheerio<any>, $listItem: cheerio.Cheerio<any>, params: SearchParams = {}): any {
    // Extract price from data-price attribute (in cents)
    const dataPrice = $listItem.attr('data-price');
    let price = '';
    if (dataPrice) {
        const priceInCents = parseInt(dataPrice, 10);
        price = (priceInCents / 100).toString();
    } else {
        // Fallback to price element
        const priceText = $listItem.find('p.prices').first().text().trim();
        const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
        if (priceMatch) {
            price = priceMatch[1].replace(/,/g, '');
        }
    }
    
    if (!price) {
        return null;
    }
    
    // Extract booking link
    const bookingLink = $listItem.find('a.modal_responsive').first().attr('href') || '';
    
    // Find headings within the search_modal
    const headings = $searchModal.find('p._heading');
    
    const outboundHeading = headings.filter((i, el) => {
        const text = $(el).text();
        return text.includes('Outbound') && !text.includes('Return');
    }).first();
    
    const returnHeading = headings.filter((i, el) => {
        const text = $(el).text();
        return text.includes('Return');
    }).first();
    
    const outboundFlight = extractFlightFromSection($, $searchModal, outboundHeading, 'outbound', params);
    
    if (!outboundFlight) {
        return null;
    }
    
    let returnFlight = null;
    if (returnHeading.length > 0) {
        returnFlight = extractFlightFromSection($, $searchModal, returnHeading, 'return', params);
    }
    
    return {
        outbound: outboundFlight,
        return: returnFlight,
        price: price,
        link: bookingLink
    };
}

// Helper function to extract flight from a section (outbound or return)
function extractFlightFromSection($: cheerio.CheerioAPI, $searchModal: cheerio.Cheerio<any>, heading: cheerio.Cheerio<any>, direction: 'outbound' | 'return', params: SearchParams): any {
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
    
    // Find all panels after this heading, until we hit the next heading
    // The heading is a direct child of search_modal, and panels come after it
    const headingParent = heading.closest('div.search_modal');
    const allElements = headingParent.children();
    
    const legs: any[] = [];
    let currentSectionDate = sectionDate;
    
    // Iterate through siblings after the heading
    // Since we already have the heading, we just process all panels until we hit the next heading
    heading.nextAll().each((index, el) => {
        const $el = $(el);
        
        // Check if we hit the next heading - stop processing
        if ($el.is('p._heading')) {
            const hText = $el.text();
            if (hText.includes('Return') || hText.includes('Outbound')) {
                return false; // Stop processing
            }
        }
        
        // Process panels
        if ($el.is('div._panel')) {
            const panelBodies = $el.find('div._panel_body');
        
        panelBodies.each((bodyIndex, bodyEl) => {
            const $body = $(bodyEl);
            const flightInfo = $body.find('div._head small').text().trim();
            
            // Extract airline and flight number (e.g., "Transavia France TO 4061")
            const flightMatch = flightInfo.match(/(.+?)\s+([A-Z0-9]{2})\s+(\d+)/);
            if (!flightMatch) {
                return;
            }
            
            const airlineName = flightMatch[1].trim();
            const airlineCode = flightMatch[2];
            const flightNumber = `${airlineCode}${flightMatch[3]}`;
            
            // Extract times and airports
            const times = $body.find('div.c3 p').map((i, el) => $(el).text().trim()).get();
            const airports = $body.find('div.c4 p').map((i, el) => $(el).text().trim()).get();
            const duration = $body.find('div.c1 p').first().text().trim();
            
            if (times.length >= 2 && airports.length >= 2) {
                const departureTime = parseTimeTo24Hour(times[0]);
                const arrivalTime = parseTimeTo24Hour(times[1]);
                const originCode = airports[0].split(' ')[0];
                const destCode = airports[1].split(' ')[0];
                
                if (departureTime && arrivalTime && originCode && destCode) {
                    // Determine arrival date (might be next day)
                    let arrivalDate = currentSectionDate;
                    const depHour = parseInt(departureTime.split(':')[0], 10);
                    const arrHour = parseInt(arrivalTime.split(':')[0], 10);
                    const depMin = parseInt(departureTime.split(':')[1], 10);
                    const arrMin = parseInt(arrivalTime.split(':')[1], 10);
                    
                    if (arrHour < depHour || (arrHour === depHour && arrMin < depMin)) {
                        // Arrival is next day
                        const date = new Date(currentSectionDate);
                        date.setDate(date.getDate() + 1);
                        arrivalDate = date.toISOString().split('T')[0];
                    }
                    
                    const flight: Flight = {
                        id: db.generateFlightId(flightNumber, { date: currentSectionDate, time: departureTime }),
                        flightNumber: flightNumber,
                        origin: { code: originCode, name: airports[0] },
                        destination: { code: destCode, name: airports[1] },
                        departure: { date: currentSectionDate, time: departureTime },
                        arrival: { date: arrivalDate, time: arrivalTime },
                        duration: duration,
                        airline: { name: airlineName },
                        cabinClass: 'M' // Always M
                    };
                    
                    db.addFlight(flight);
                    
                    // Extract connection time (from next sibling p.connect_airport)
                    const connectionTimeEl = $body.next('p.connect_airport');
                    let connectionTime: string | undefined = undefined;
                    if (connectionTimeEl.length > 0) {
                        const connTimeText = connectionTimeEl.find('span').text().trim();
                        if (connTimeText) {
                            connectionTime = connTimeText;
                        }
                    }
                    
                    legs.push({
                        flight: flight.id,
                        connectionTime: connectionTime
                    });
                    
                    // Update current section date for next leg
                    currentSectionDate = arrivalDate;
                }
            }
        });
        }
    });
    
    if (legs.length === 0) {
        return null;
    }
    
    // Extract origin and destination from trip summary in _panel_heading
    // Find the panel heading that corresponds to this section
    const panelHeadings = $searchModal.find('div._panel_heading');
    let panelHeading: cheerio.Cheerio<any> = panelHeadings.first(); // Default to first
    
    panelHeadings.each((index, el) => {
        const $ph = $(el);
        // Check if this panel heading is after our heading and before next heading
        const headingBefore = $ph.prevAll('p._heading').filter((i, h) => {
            const text = $(h).text();
            return direction === 'outbound' ? text.includes('Outbound') : text.includes('Return');
        }).first();
        
        if (headingBefore.length > 0) {
            panelHeading = $ph;
            return false; // Found it, stop searching
        }
    });
    
    const trip = panelHeading.find('div.trip');
    const tripTimes = trip.find('p.time span').map((i, el) => $(el).text().trim()).get();
    const originCode = tripTimes[0] || '';
    const destCode = tripTimes[tripTimes.length - 1] || '';
    const totalDuration = trip.find('div._stops p.time').first().text().trim();
    const stopCountText = trip.find('div._stops p.stop').text().trim();
    const stopCount = parseInt(stopCountText.match(/\d+/)?.at(0) || '0', 10);
    
    return {
        legs: legs,
        origin: originCode,
        destination: destCode,
        duration: totalDuration,
        stopCount: stopCount
    };
}

// Note: Price extraction is now handled in extractFlightFromSearchModal

// Main function to fetch Kiwi flights
export async function fetchKiwi(params: SearchParams = {}): Promise<{ flights: any[]; success: boolean; error?: string }> {
    try {
        // Clear the in-memory DB
        db.clear();
        
        // Step 1: Make initial GET request
        const initialResponse = await getRequest(params);
        
        if (!initialResponse.success) {
            return { flights: [], success: false, error: `Initial request failed: ${initialResponse.statusText}` };
        }
        
        
        if (!initialResponse.data || !initialResponse.data._token) {
            return { flights: [], success: false, error: 'Failed to extract data object or token from initial request' };
        }
        
        // Step 2: Make single poll request
        const pollResponse = await pollRequest(
            initialResponse.cookies,
            initialResponse.data,
            initialResponse.url || ''
        );
        
        if (!pollResponse.success) {
            return { flights: [], success: false, error: pollResponse.error || 'Poll request failed' };
        }
        
        
        // Step 3: Extract flights from poll response
        const extractedFlights = extractFlights(pollResponse.body, params);
        
        // Process extracted flights and create trips/deals
        extractedFlights.forEach((flightData: any) => {
            if (!flightData.outbound || !flightData.outbound.legs || flightData.outbound.legs.length === 0) {
                return;
            }
            
            const outboundLegs: Leg[] = flightData.outbound.legs.map((leg: any) => ({
                flight: leg.flight,
                connectionTime: leg.connectionTime
            }));
            
            const inboundLegs: Leg[] = flightData.return && flightData.return.legs
                ? flightData.return.legs.map((leg: any) => ({
                    flight: leg.flight,
                    connectionTime: leg.connectionTime
                }))
                : [];
            
            const tripId = db.generateTripId(outboundLegs, inboundLegs);
            
            const trip: Trip = {
                id: tripId,
                duration: flightData.outbound.duration || '',
                origin: { code: flightData.outbound.origin, name: flightData.outbound.origin },
                destination: { code: flightData.outbound.destination, name: flightData.outbound.destination },
                stopCount: flightData.outbound.stopCount || 0,
                outboundLegs: outboundLegs,
                inboundLegs: inboundLegs
            };
            
            db.addTrip(trip);
            
            const deal: Deal = {
                trip: tripId,
                price: flightData.price,
                provider: 'kiwi',
                link: flightData.link,
                last_update: new Date().toISOString()
            };
            
            db.addDeal(deal);
        });
        
        const tripsWithDeals = db.getAllTripsWithDeals();
        
        return { flights: extractedFlights, success: true };
    } catch (error) {
        console.error('[Kiwi] Error in fetchKiwi:', error);
        return {
            flights: [],
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

