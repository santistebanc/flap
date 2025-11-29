/**
 * Redis operations for Leg entities
 */
import redis from './client';
import { Leg } from '../../types';

export async function storeLeg(leg: Leg, expirationSeconds?: number): Promise<void> {
  const key = `leg:${leg.id}`;
  
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
}

export async function getLegsByTrip(tripId: string): Promise<Leg[]> {
  const legs: Leg[] = [];
  let cursor = '0';
  const legPattern = `leg:${tripId}_*`;
  
  // Scan leg keys that match the tripId pattern (leg IDs are: ${tripId}_${direction}_${flightId})
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      legPattern,
      'COUNT',
      '100'
    );
    cursor = nextCursor;
    
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.hgetall(key);
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
    }
  } while (cursor !== '0');
  
  // Sort by order
  return legs.sort((a, b) => a.order - b.order);
}

