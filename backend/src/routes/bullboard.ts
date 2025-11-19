import { FastifyInstance } from 'fastify';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { flightQueue } from '../services/queue';

export async function bullBoardRoutes(fastify: FastifyInstance) {
  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: [
      new BullMQAdapter(flightQueue),
    ],
    serverAdapter,
  });

  await fastify.register(serverAdapter.registerPlugin(), {
    prefix: '/admin/queues',
  });
}

