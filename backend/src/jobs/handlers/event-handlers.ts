/**
 * Worker event handlers
 */
import { Job } from 'bullmq';
import { FlightJobData } from '../../services/queue';

export function setupEventHandlers(worker: any): void {
  worker.on('ready', () => {
    console.log('✅ Flight worker is ready and listening for jobs');
  });

  worker.on('active', (job: Job<FlightJobData>) => {
    console.log(`🔄 Job ${job.id} is now active for source ${job.data.source}, fetchId: ${job.data.fetchId}`);
  });

  worker.on('completed', (job: Job<FlightJobData>) => {
    console.log(`✅ Job ${job.id} completed for source ${job.data.source}`);
  });

  worker.on('failed', (job: Job<FlightJobData> | undefined, err: Error) => {
    console.error(`❌ Job ${job?.id} failed for source ${job?.data.source}:`, err);
    console.error(`Error details:`, err.message);
    console.error(`Stack trace:`, err.stack);
  });

  worker.on('error', (err: Error) => {
    console.error('❌ Worker error:', err);
  });

  worker.on('stalled', (jobId: string) => {
    console.warn(`⚠️ Job ${jobId} stalled`);
  });

  worker.on('closed', () => {
    console.log('Worker closed');
  });
}

