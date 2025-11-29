/**
 * Get search results data by querying deals that match search parameters
 * Groups deals by trip and builds complete search results
 */
import { getTrip, getLegsByTrip, getFlight } from '../../utils/redis';
import { generateLegId, generateSourceSearchId } from '../../utils/ids';
import redis from '../../utils/redis/client';
import { SearchRequest, Flight } from '../../types';

export interface Airport {
  code: string;
  name: string;
}

export interface DateTime {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

export interface Airline {
  name: string;
}

export interface SearchResultLeg {
  legId: string;
  flightId: string;
  flightNumber: string;
  origin: Airport;
  destination: Airport;
  departure: DateTime;
  arrival: DateTime;
  duration: string;
  airline: Airline;
  cabinClass: string;
  connectionTime?: string;
}

export interface SearchResult {
  tripId: string;
  origin: Airport;
  destination: Airport;
  outboundLegs: SearchResultLeg[];
  inboundLegs: SearchResultLeg[];
  deals: {
    dealId: string;
    price: string;
    provider: string;
    link?: string;
    last_update: string;
  }[];
}

export async function getSearchResultsData(
  request: SearchRequest,
  source: string
): Promise<SearchResult[]> {

  // Generate sourceSearchId to use for direct pattern matching
  const searchId = generateSourceSearchId(source, request);
  const dealPattern = `deal:${searchId}_*`;

  // Query deals that match the searchId pattern directly
  const matchingDeals: any[] = [];
  let cursor = '0';
  let totalScanned = 0;
  let totalDeals = 0;
  
  // Scan only deals that match the searchId pattern
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      dealPattern,
      'COUNT',
      '100'
    );
    cursor = nextCursor;
    totalScanned += keys.length;

    // Get all deals in batch
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.hgetall(key);
      }
      const results = await pipeline.exec();

      if (results) {
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (!result || result[0]) {
            continue; // Skip errors
          }
          const data = result[1] as Record<string, string>;
          if (!data || Object.keys(data).length === 0) {
            continue;
          }

          totalDeals++;

          // All deals matching the pattern already match the search criteria
          // (since searchId includes source, origin, destination, dates)
          matchingDeals.push({
            id: data.id,
            trip: data.trip,
            origin: data.origin,
            destination: data.destination,
            is_round: data.is_round === 'true',
            departure_date: data.departure_date,
            departure_time: data.departure_time,
            return_date: data.return_date || null,
            return_time: data.return_time || null,
            source: data.source,
            provider: data.provider,
            price: parseFloat(data.price),
            link: data.link,
            created_at: data.created_at,
            updated_at: data.updated_at,
          });
        }
      }
    }
  } while (cursor !== '0');

  console.log(`[getSearchResultsData] Scanned ${totalScanned} keys with pattern ${dealPattern}, found ${totalDeals} matching deals for source=${source}, origin=${request.origin}, destination=${request.destination}, departureDate=${request.departureDate}, returnDate=${request.returnDate || 'none'}`);

  if (matchingDeals.length === 0) {
    return [];
  }

  // Group deals by trip ID
  const dealsByTrip = new Map<string, any[]>();
  for (const deal of matchingDeals) {
    if (!dealsByTrip.has(deal.trip)) {
      dealsByTrip.set(deal.trip, []);
    }
    dealsByTrip.get(deal.trip)!.push(deal);
  }

  // Build results for each trip
  const results: SearchResult[] = [];
  for (const [tripId, tripDeals] of dealsByTrip.entries()) {
    const trip = await getTrip(tripId);
    if (!trip) {
      console.log(`[getSearchResultsData] Trip ${tripId} not found in Redis`);
      continue;
    }

    const legs = await getLegsByTrip(tripId);
    if (legs.length === 0) {
      console.log(`[getSearchResultsData] Trip ${tripId} has no legs (has ${tripDeals.length} deals)`);
      continue;
    }

    // Separate legs into outbound and inbound
    const outboundLegs = legs.filter(l => !l.inbound).sort((a, b) => a.order - b.order);
    const inboundLegs = legs.filter(l => l.inbound).sort((a, b) => a.order - b.order);

    // Fetch all flights for this trip (for leg building)
    const flightMap = new Map<string, Flight>();
    for (const leg of legs) {
      if (!flightMap.has(leg.flight)) {
        const flight = await getFlight(leg.flight);
        if (flight) {
          flightMap.set(leg.flight, flight);
        }
      }
    }

    // Build outbound legs with full flight details
    const outboundLegsWithFlights: SearchResultLeg[] = [];
    for (const leg of outboundLegs) {
      const flight = flightMap.get(leg.flight);
      if (!flight) continue;

      const legId = generateLegId(tripId, flight.id, false);
      outboundLegsWithFlights.push({
        legId,
        flightId: flight.id,
        flightNumber: flight.flight_number,
        origin: {
          code: flight.origin,
          name: flight.origin, // TODO: Get full airport name if available
        },
        destination: {
          code: flight.destination,
          name: flight.destination, // TODO: Get full airport name if available
        },
        departure: {
          date: flight.departure_date,
          time: flight.departure_time,
        },
        arrival: {
          date: flight.arrival_date,
          time: flight.arrival_time,
        },
        duration: `${flight.duration}`,
        airline: {
          name: flight.airline,
        },
        cabinClass: 'economy', // TODO: Get from flight data if available
        connectionTime: leg.connection_time !== null ? `${leg.connection_time}` : undefined,
      });
    }

    // Build inbound legs with full flight details
    const inboundLegsWithFlights: SearchResultLeg[] = [];
    for (const leg of inboundLegs) {
      const flight = flightMap.get(leg.flight);
      if (!flight) continue;

      const legId = generateLegId(tripId, flight.id, true);
      inboundLegsWithFlights.push({
        legId,
        flightId: flight.id,
        flightNumber: flight.flight_number,
        origin: {
          code: flight.origin,
          name: flight.origin, // TODO: Get full airport name if available
        },
        destination: {
          code: flight.destination,
          name: flight.destination, // TODO: Get full airport name if available
        },
        departure: {
          date: flight.departure_date,
          time: flight.departure_time,
        },
        arrival: {
          date: flight.arrival_date,
          time: flight.arrival_time,
        },
        duration: `${flight.duration}`,
        airline: {
          name: flight.airline,
        },
        cabinClass: 'economy', // TODO: Get from flight data if available
        connectionTime: leg.connection_time !== null ? `${leg.connection_time}` : undefined,
      });
    }

    // Get trip metadata from first deal
    const firstDeal = tripDeals[0];
    const origin: Airport = { code: firstDeal.origin, name: firstDeal.origin };
    const destination: Airport = { code: firstDeal.destination, name: firstDeal.destination };

    // Format deals
    const formattedDeals = tripDeals.map(deal => ({
      dealId: deal.id,
      price: `${deal.price}`,
      provider: deal.provider,
      link: deal.link,
      last_update: deal.updated_at,
    }));

    results.push({
      tripId,
      origin,
      destination,
      outboundLegs: outboundLegsWithFlights,
      inboundLegs: inboundLegsWithFlights,
      deals: formattedDeals,
    });
  }

  console.log(`[getSearchResultsData] Built ${results.length} search results for source=${source}`);
  return results;
}

