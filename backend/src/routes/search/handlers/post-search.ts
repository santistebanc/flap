/**
 * POST /api/search - Search (query) the database for existing results
 */
import { FastifyReply, FastifyRequest } from 'fastify';
import { generateSearchId } from '../../../utils/ids';
import { aggregateSourceResults } from '../../../services/search-results';

export async function postSearch(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = request.body as { origin: string; destination: string; departureDate: string; returnDate?: string };
    const sources = ['skyscanner', 'kiwi'];
    
    // Aggregate results from all source searches
    const results = await aggregateSourceResults(sources, body);
    
    return reply.send({
      searchId: generateSearchId(body),
      results: results,
    });
  } catch (error) {
    console.error('Error searching database:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

