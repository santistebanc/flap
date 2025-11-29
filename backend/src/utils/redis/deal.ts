/**
 * Redis operations for Deal entities
 */
import redis from './client';
import { Deal } from '../../types';

export async function storeDeal(deal: Deal, expirationSeconds?: number): Promise<void> {
  const key = `deal:${deal.id}`;
  
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
}

