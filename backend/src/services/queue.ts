import { Queue } from 'bullmq';
import { SearchRequest } from '../types';
import { getRedisConfig } from '../jobs/config/redis-config';

const queueRedisConfig = getRedisConfig();

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
      `fetch-${searchId}`,
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

