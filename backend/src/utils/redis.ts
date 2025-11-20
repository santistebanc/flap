import Redis from 'ioredis';
import { Deal, Flight, Leg, Trip } from '../types';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export default redis;

// Helper functions for storing and retrieving data
export async function storeTrip(trip: Trip, expirationSeconds?: number): Promise<void> {
  const key = `trip:${trip.id}`;
  
  // Check if key exists and delete it if it's not a hash (to handle type conflicts)
  const type = await redis.type(key);
  if (type !== 'none' && type !== 'hash') {
    await redis.del(key);
  }
  
  await redis.hset(key, {
    id: trip.id,
    created_at: trip.created_at,
  });
  await redis.expire(key, expirationSeconds || 86400);
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const key = `trip:${tripId}`;
  const data = await redis.hgetall(key);
  
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  
  return {
    id: data.id,
    created_at: data.created_at,
  };
}

export async function storeFlight(flight: Flight, expirationSeconds?: number): Promise<void> {
  const key = `flight:${flight.id}`;
  
  // Check if key exists and delete it if it's not a hash (to handle type conflicts)
  const type = await redis.type(key);
  if (type !== 'none' && type !== 'hash') {
    await redis.del(key);
  }
  
  await redis.hset(key, {
    id: flight.id,
    flight_number: flight.flight_number,
    airline: flight.airline,
    origin: flight.origin,
    destination: flight.destination,
    departure_date: flight.departure_date,
    departure_time: flight.departure_time,
    arrival_date: flight.arrival_date,
    arrival_time: flight.arrival_time,
    duration: flight.duration.toString(),
    created_at: flight.created_at,
  });
  await redis.expire(key, expirationSeconds || 86400);
}

export async function getFlight(flightId: string): Promise<Flight | null> {
  const key = `flight:${flightId}`;
  const data = await redis.hgetall(key);
  
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  
  return {
    id: data.id,
    flight_number: data.flight_number,
    airline: data.airline,
    origin: data.origin,
    destination: data.destination,
    departure_date: data.departure_date,
    departure_time: data.departure_time,
    arrival_date: data.arrival_date,
    arrival_time: data.arrival_time,
    duration: parseInt(data.duration, 10),
    created_at: data.created_at,
  };
}

export async function storeLeg(leg: Leg, expirationSeconds?: number): Promise<void> {
  const key = `leg:${leg.id}`;
  const tripLegsKey = `trip:${leg.trip}:legs`;
  
  // Check if key exists and delete it if it's not a hash (to handle type conflicts)
  const type = await redis.type(key);
  if (type !== 'none' && type !== 'hash') {
    await redis.del(key);
  }
  
  await redis.hset(key, {
    id: leg.id,
    trip: leg.trip,
    flight: leg.flight,
    inbound: leg.inbound.toString(),
    order: leg.order.toString(),
    connection_time: leg.connection_time !== null ? leg.connection_time.toString() : 'null',
    created_at: leg.created_at,
  });
  await redis.expire(key, expirationSeconds || 86400);
  
  // Add to trip legs index
  await redis.sadd(tripLegsKey, leg.id);
  await redis.expire(tripLegsKey, expirationSeconds || 86400);
}

export async function storeDeal(deal: Deal, expirationSeconds?: number): Promise<void> {
  const key = `deal:${deal.id}`;
  const tripDealsKey = `trip:${deal.trip}:deals`;
  
  // Check if key exists and delete it if it's not a hash (to handle type conflicts)
  const type = await redis.type(key);
  if (type !== 'none' && type !== 'hash') {
    await redis.del(key);
  }
  
  await redis.hset(key, {
    id: deal.id,
    trip: deal.trip,
    origin: deal.origin,
    destination: deal.destination,
    stop_count: deal.stop_count.toString(),
    duration: deal.duration.toString(),
    is_round: deal.is_round.toString(),
    departure_date: deal.departure_date,
    departure_time: deal.departure_time,
    return_date: deal.return_date || '',
    return_time: deal.return_time || '',
    source: deal.source,
    provider: deal.provider,
    price: deal.price.toString(),
    link: deal.link,
    created_at: deal.created_at,
    updated_at: deal.updated_at,
  });
  await redis.expire(key, expirationSeconds || 86400);
  
  // Add to trip deals index
  await redis.sadd(tripDealsKey, deal.id);
  await redis.expire(tripDealsKey, expirationSeconds || 86400);
}

// Get all deals for a trip
export async function getDealsByTrip(tripId: string): Promise<Deal[]> {
  const tripDealsKey = `trip:${tripId}:deals`;
  const dealIds = await redis.smembers(tripDealsKey);
  
  if (dealIds.length === 0) {
    return [];
  }
  
  const deals: Deal[] = [];
  
  // Use pipeline for better performance
  const pipeline = redis.pipeline();
  for (const dealId of dealIds) {
    pipeline.hgetall(`deal:${dealId}`);
  }
  const results = await pipeline.exec();
  
  if (results) {
    for (const result of results) {
      if (!result || result[0]) {
        continue; // Skip errors
      }
      const data = result[1] as Record<string, string>;
      if (!data || Object.keys(data).length === 0) {
        continue;
      }
      
      deals.push({
        id: data.id,
        trip: data.trip,
        origin: data.origin,
        destination: data.destination,
        stop_count: parseInt(data.stop_count, 10),
        duration: parseInt(data.duration, 10),
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
  
  return deals;
}

// Get all legs for a trip
export async function getLegsByTrip(tripId: string): Promise<Leg[]> {
  const tripLegsKey = `trip:${tripId}:legs`;
  const legIds = await redis.smembers(tripLegsKey);
  
  if (legIds.length === 0) {
    return [];
  }
  
  const legs: Leg[] = [];
  
  // Use pipeline for better performance
  const pipeline = redis.pipeline();
  for (const legId of legIds) {
    pipeline.hgetall(`leg:${legId}`);
  }
  const results = await pipeline.exec();
  
  if (results) {
    for (const result of results) {
      if (!result || result[0]) {
        continue; // Skip errors
      }
      const data = result[1] as Record<string, string>;
      if (!data || Object.keys(data).length === 0) {
        continue;
      }
      
      legs.push({
        id: data.id,
        trip: data.trip,
        flight: data.flight,
        inbound: data.inbound === 'true',
        order: parseInt(data.order, 10),
        connection_time: data.connection_time && data.connection_time !== 'null' ? parseInt(data.connection_time, 10) : null,
        created_at: data.created_at,
      });
    }
  }
  
  // Sort by order
  return legs.sort((a, b) => a.order - b.order);
}

// Calculate expiration: 2 days after departure date
export function calculateExpiration(departureDate: string): number {
  const departure = new Date(departureDate);
  const expiration = new Date(departure);
  expiration.setDate(expiration.getDate() + 2);
  const now = new Date();
  const secondsUntilExpiration = Math.max(0, Math.floor((expiration.getTime() - now.getTime()) / 1000));
  return secondsUntilExpiration;
}

// Store search job status
export async function storeSearchJob(searchJob: { searchId: string; [key: string]: unknown }): Promise<void> {
  const key = `search:${searchJob.searchId}`;
  await redis.set(key, JSON.stringify(searchJob));
}

export async function getSearchJob(searchId: string): Promise<{ searchId: string; [key: string]: unknown } | null> {
  const key = `search:${searchId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}


// Store search -> trips mapping
export async function storeSearchTrips(searchId: string, tripIds: string[]): Promise<void> {
  const key = `search:${searchId}:trips`;
  await redis.sadd(key, ...tripIds);
  // Set expiration to match the search job expiration
  await redis.expire(key, 86400 * 7); // 7 days
}

export async function getSearchTrips(searchId: string): Promise<string[]> {
  const key = `search:${searchId}:trips`;
  return await redis.smembers(key);
}

// Helper function to scan keys using SCAN instead of KEYS
async function scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  
  do {
    const [nextCursor, foundKeys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      '100'
    );
    cursor = nextCursor;
    keys.push(...foundKeys);
  } while (cursor !== '0');
  
  return keys;
}

// Clear all flight-related data
export async function clearAllData(): Promise<{ deleted: number }> {
  const patterns = [
    'flight:*',
    'leg:*',
    'trip:*',
    'deal:*',
    'search:*',
  ];
  
  let totalDeleted = 0;
  
  for (const pattern of patterns) {
    const keys = await scanKeys(pattern);
    if (keys.length > 0) {
      // Delete in batches to avoid blocking
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const deleted = await redis.del(...batch);
        totalDeleted += deleted;
      }
    }
  }
  
  return { deleted: totalDeleted };
}

