/**
 * Main job processing handler
 */
import { Job } from 'bullmq';
import { ResultAsync } from 'neverthrow';
import { FlightJobData } from '../../services/queue';
import { processFlightJob } from '../processors';

export async function handleJob(job: Job<FlightJobData>): Promise<number> {
  const { searchId, source } = job.data;
  console.log(`🔄 Processing job ${job.id} for source ${source}, searchId: ${searchId}`);
  
  // Process the job
  const processResult = await ResultAsync.fromPromise(
    processFlightJob(job),
    (error) => error instanceof Error ? error : new Error(String(error))
  );
  
  if (processResult.isErr()) {
    console.error(`❌ Error in worker for job ${job.id} (${source}):`, processResult.error);
    // Re-throw to let BullMQ handle retries
    throw processResult.error;
  }
  
  const resultCount = processResult.value;
  
  console.log(`✅ Job ${job.id} (${source}) completed with ${resultCount} results`);
  return resultCount;
}

