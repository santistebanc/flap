import Fastify from 'fastify';
import cors from '@fastify/cors';
import { searchRoutes } from './routes/search';
import { bullBoardRoutes } from './routes/bullboard';
import { flightWorker } from './jobs/worker';

const fastify = Fastify({
  logger: true,
});

// Register CORS
fastify.register(cors, {
  origin: true,
});

// Register routes
fastify.register(searchRoutes);
fastify.register(bullBoardRoutes);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Start worker
console.log('Starting flight worker...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await flightWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await flightWorker.close();
  process.exit(0);
});

// Start server
start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

