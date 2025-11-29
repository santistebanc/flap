/**
 * Main job processing handler
 */
import { Job } from 'bullmq';
import { Result, Err } from 'ts-results';
import { FlightJobData } from '../../services/queue';
import { processFlightJob } from '../processors';
import { fromPromise } from '../../utils/result-async';

export async function handleJob(job: Job<FlightJobData>): Promise<number> {
  const { fetchId, source } = job.data;
  console.log(`🔄 Processing job ${job.id} for source ${source}, fetchId: ${fetchId}`);
  
  // Process the job
  const processResult = await fromPromise(
    processFlightJob(job),
    (error: unknown) => error instanceof Error ? error : new Error(String(error))
  );
  
  if (processResult.err) {
    console.error(`❌ Error in worker for job ${job.id} (${source}):`, processResult.val);
    // Re-throw to let BullMQ handle retries
    throw processResult.val;
  }
  
  const resultCount = processResult.val;
  
  console.log(`✅ Job ${job.id} (${source}) completed with ${resultCount} results`);
  return resultCount;
}

