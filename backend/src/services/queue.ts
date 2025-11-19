import { Queue } from 'bullmq';
import { SearchRequest } from '../types';

interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
}

const queueRedisConfig: RedisConnectionConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

if (process.env.REDIS_PASSWORD) {
  queueRedisConfig.password = process.env.REDIS_PASSWORD;
}

export const flightQueue = new Queue('flight-search', {
  connection: queueRedisConfig,
});

export interface FlightJobData {
  searchId: string;
  source: string;
  request: SearchRequest;
}

export async function addFlightJob(
  searchId: string,
  source: string,
  request: SearchRequest
): Promise<string> {
  console.log(`📤 Adding job for search ${searchId}, source ${source}`);
  try {
    const job = await flightQueue.add(
      `fetch-${source}`,
      {
        searchId,
        source,
        request,
      } as FlightJobData,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
    console.log(`✅ Job ${job.id} added to queue for source ${source}, searchId: ${searchId}`);
    return job.id!;
  } catch (error) {
    console.error(`❌ Failed to add job for source ${source}, searchId: ${searchId}:`, error);
    throw error;
  }
}

