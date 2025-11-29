/**
 * Main job processing handler
 */
import { Job } from 'bullmq';
import { Result, ResultAsync, ok } from 'neverthrow';
import { FlightJobData } from '../../services/queue';
import { processFlightJob } from '../processors';
import { getSearchJob, storeSearchJob } from '../../utils/redis';
import { SearchJob } from '../../types';

async function updateJobStatus(
  searchId: string,
  jobId: string,
  source: string,
  status: 'active' | 'completed' | 'failed',
  updates?: { completedAt?: string; resultCount?: number; lastFetchedAt?: string }
): Promise<Result<void, Error>> {
  return ResultAsync.fromPromise(
    (async () => {
      const sourceSearchJob = await getSearchJob(searchId) as any;
      if (sourceSearchJob && sourceSearchJob.job) {
        sourceSearchJob.job.status = status;
        if (updates) {
          if (updates.completedAt) sourceSearchJob.job.completedAt = updates.completedAt;
          if (updates.resultCount !== undefined) sourceSearchJob.job.resultCount = updates.resultCount;
          if (updates.lastFetchedAt) sourceSearchJob.job.lastFetchedAt = updates.lastFetchedAt;
        }
        await storeSearchJob(sourceSearchJob);
      } else {
        console.warn(`⚠️ Source search job not found for searchId: ${searchId}`);
      }
    })(),
    (error) => error instanceof Error ? error : new Error(String(error))
  );
}

export async function handleJob(job: Job<FlightJobData>): Promise<number> {
  const { searchId, source } = job.data;
  console.log(`🔄 Processing job ${job.id} for source ${source}, searchId: ${searchId}`);
  
  // Update status to active
  await updateJobStatus(searchId, job.id as string, source, 'active');
  
  // Process the job
  const processResult = await ResultAsync.fromPromise(
    processFlightJob(job),
    (error) => error instanceof Error ? error : new Error(String(error))
  );
  
  if (processResult.isErr()) {
    console.error(`❌ Error in worker for job ${job.id} (${source}):`, processResult.error);
    // Try to update status to failed (ignore errors here)
    await updateJobStatus(searchId, job.id as string, source, 'failed').mapErr(() => {
      console.error(`❌ Failed to update job status to failed`);
    });
    // Re-throw to let BullMQ handle retries
    throw processResult.error;
  }
  
  const resultCount = processResult.value;
  const completedAt = new Date().toISOString();
  
  // Update status to completed
  await updateJobStatus(searchId, job.id as string, source, 'completed', {
    completedAt,
    resultCount,
    lastFetchedAt: completedAt,
  });
  
  console.log(`✅ Job ${job.id} (${source}) completed with ${resultCount} results`);
  return resultCount;
}

