/**
 * POST /api/fetch/source/:source - Fetch flights for a specific source
 */
import { FastifyReply, FastifyRequest } from 'fastify';
import { addFlightJob } from '../../../services/queue';
import { storeSearchJob } from '../../../utils/redis';
import { generateSourceSearchId } from '../../../utils/ids';

export async function postFetchSource(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { source } = request.params as { source: string };
    const body = request.body as { origin: string; destination: string; departureDate: string; returnDate?: string };
    
    const sourceSearchId = generateSourceSearchId(source, body);
    
    // Always create a new job when explicitly requested (user clicked fetch button)
    const jobId = await addFlightJob(sourceSearchId, source, body);
    const sourceJob = {
      searchId: sourceSearchId,
      request: body,
      source,
      job: {
        jobId,
        status: 'pending',
      },
      createdAt: new Date().toISOString(),
    };
    await storeSearchJob(sourceJob);
    
    return reply.code(201).send({
      searchId: sourceSearchId,
      status: 'processing',
      job: {
        jobId,
        status: 'pending',
      },
      results: [],
      isExisting: false,
    });
  } catch (error) {
    console.error('Error creating source search:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

