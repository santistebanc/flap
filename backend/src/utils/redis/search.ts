/**
 * Redis operations for Search entities
 */
import redis from './client';

export async function storeSearchJob(searchJob: { searchId: string; [key: string]: unknown }): Promise<void> {
  const key = `search:${searchJob.searchId}`;
  await redis.set(key, JSON.stringify(searchJob));
}

export async function getSearchJob(searchId: string): Promise<{ searchId: string; [key: string]: unknown } | null> {
  const key = `search:${searchId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}


