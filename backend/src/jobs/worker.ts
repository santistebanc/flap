import { Worker } from 'bullmq';
import { FlightJobData } from '../services/queue';
import { processFlightJob } from './processors';
import { getSearchJob, storeSearchJob } from '../utils/redis';
import { SearchJob } from '../types';

interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
}

const redisConfig: RedisConnectionConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

export const flightWorker = new Worker<FlightJobData>(
  'flight-search',
  async (job) => {
    const { searchId, source } = job.data;
    console.log(`🔄 Processing job ${job.id} for source ${source}, searchId: ${searchId}`);
    
    try {
      // Update source search job status to active
      const sourceSearchJob = await getSearchJob(searchId) as any;
      if (sourceSearchJob && sourceSearchJob.job) {
        console.log(`📝 Updating job ${job.id} (${source}) status to 'active'`);
        sourceSearchJob.job.status = 'active';
        await storeSearchJob(sourceSearchJob);
      } else {
        console.warn(`⚠️ Source search job not found for searchId: ${searchId}`);
      }
      
      // Process the job and get result count
      const resultCount = await processFlightJob(job);
      const completedAt = new Date().toISOString();
      
      // Update source search job status to completed
      const updatedSourceSearchJob = await getSearchJob(searchId) as any;
      if (updatedSourceSearchJob && updatedSourceSearchJob.job) {
        console.log(`✅ Updating job ${job.id} (${source}) status to 'completed' with ${resultCount} results`);
        updatedSourceSearchJob.job.status = 'completed';
        updatedSourceSearchJob.job.completedAt = completedAt;
        updatedSourceSearchJob.job.resultCount = resultCount;
        updatedSourceSearchJob.job.lastFetchedAt = completedAt;
        await storeSearchJob(updatedSourceSearchJob);
      } else {
        console.warn(`⚠️ Source search job not found when trying to mark ${source} as completed for searchId: ${searchId}`);
      }
    } catch (error) {
      console.error(`❌ Error in worker for job ${job.id} (${source}):`, error);
      // Try to update status to failed
      try {
        const failedSourceSearchJob = await getSearchJob(searchId) as any;
        if (failedSourceSearchJob && failedSourceSearchJob.job) {
          failedSourceSearchJob.job.status = 'failed';
          await storeSearchJob(failedSourceSearchJob);
        }
      } catch (updateError) {
        console.error(`❌ Failed to update job status to failed:`, updateError);
      }
      // Re-throw to let BullMQ handle retries
      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: 10, // Process up to 10 jobs in parallel
  }
);

flightWorker.on('ready', () => {
  console.log('✅ Flight worker is ready and listening for jobs');
});

flightWorker.on('active', (job) => {
  console.log(`🔄 Job ${job.id} is now active for source ${job.data.source}, searchId: ${job.data.searchId}`);
});

flightWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed for source ${job.data.source}`);
});

flightWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed for source ${job?.data.source}:`, err);
  console.error(`Error details:`, err.message);
  console.error(`Stack trace:`, err.stack);
  
  // Update source search job status
  if (job) {
    const { searchId, source } = job.data;
    getSearchJob(searchId)
      .then((sourceSearchJob) => {
        const typedSourceSearchJob = sourceSearchJob as any;
        if (typedSourceSearchJob && typedSourceSearchJob.job) {
          console.log(`📝 Updating job ${job.id} (${source}) status to 'failed'`);
          typedSourceSearchJob.job.status = 'failed';
          return storeSearchJob(typedSourceSearchJob);
        } else {
          console.warn(`⚠️ Could not update failed status: source search job not found`);
        }
      })
      .catch((updateError) => {
        console.error(`❌ Error updating failed status:`, updateError);
      });
  }
});

flightWorker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

flightWorker.on('stalled', (jobId) => {
  console.warn(`⚠️ Job ${jobId} stalled`);
});

// Log when worker closes
flightWorker.on('closed', () => {
  console.log('Worker closed');
});

