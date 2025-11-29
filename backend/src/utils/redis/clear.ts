/**
 * Clear all flight-related data from Redis
 */
import redis from './client';

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

