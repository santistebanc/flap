import { Worker } from 'bullmq';
import { FlightJobData } from '../services/queue';
import { getRedisConfig } from './config/redis-config';
import { handleJob } from './handlers/job-handler';
import { setupEventHandlers } from './handlers/event-handlers';

export const flightWorker = new Worker<FlightJobData>(
  'flight-search',
  handleJob,
  {
    connection: getRedisConfig(),
    concurrency: 10, // Process up to 10 jobs in parallel
  }
);

setupEventHandlers(flightWorker);

