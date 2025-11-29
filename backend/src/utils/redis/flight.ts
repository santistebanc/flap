/**
 * Redis operations for Flight entities
 */
import redis from './client';
import { Flight } from '../../types';

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

