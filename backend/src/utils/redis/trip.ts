/**
 * Redis operations for Trip entities
 */
import redis from './client';
import { Trip } from '../../types';

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

