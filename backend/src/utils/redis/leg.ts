/**
 * Redis operations for Leg entities
 */
import redis from './client';
import { Leg } from '../../types';

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

