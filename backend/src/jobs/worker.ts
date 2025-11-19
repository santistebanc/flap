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
      // Update search job status to active
      const searchJob = await getSearchJob(searchId) as SearchJob | null;
      if (searchJob && searchJob.jobs[source]) {
        console.log(`📝 Updating job ${job.id} (${source}) status to 'active'`);
        searchJob.jobs[source].status = 'active';
        await storeSearchJob(searchJob);
      } else {
        console.warn(`⚠️ Search job not found or source ${source} not in jobs for searchId: ${searchId}`);
      }
      
      // Process the job
      await processFlightJob(job);
      
      // Update search job status to completed
      const updatedSearchJob = await getSearchJob(searchId) as SearchJob | null;
      if (updatedSearchJob && updatedSearchJob.jobs[source]) {
        console.log(`✅ Updating job ${job.id} (${source}) status to 'completed'`);
        updatedSearchJob.jobs[source].status = 'completed';
        updatedSearchJob.jobs[source].completedAt = new Date().toISOString();
        await storeSearchJob(updatedSearchJob);
      } else {
        console.warn(`⚠️ Search job not found when trying to mark ${source} as completed for searchId: ${searchId}`);
      }
    } catch (error) {
      console.error(`❌ Error in worker for job ${job.id} (${source}):`, error);
      // Try to update status to failed
      try {
        const failedSearchJob = await getSearchJob(searchId) as SearchJob | null;
        if (failedSearchJob && failedSearchJob.jobs[source]) {
          failedSearchJob.jobs[source].status = 'failed';
          await storeSearchJob(failedSearchJob);
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
  
  // Update search job status
  if (job) {
    const { searchId, source } = job.data;
    getSearchJob(searchId)
      .then((searchJob) => {
        const typedSearchJob = searchJob as SearchJob | null;
        if (typedSearchJob && typedSearchJob.jobs[source]) {
          console.log(`📝 Updating job ${job.id} (${source}) status to 'failed'`);
          typedSearchJob.jobs[source].status = 'failed';
          return storeSearchJob(typedSearchJob);
        } else {
          console.warn(`⚠️ Could not update failed status: search job not found or source ${source} not in jobs`);
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

