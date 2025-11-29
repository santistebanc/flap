/**
 * Redis operations for Deal entities
 */
import redis from './client';
import { Deal } from '../../types';

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

