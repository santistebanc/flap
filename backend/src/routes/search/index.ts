/**
 * Search routes - main registration file
 */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { searchSchema } from './schema';
import { postFetchSource } from './handlers/post-fetch-source';
import { postSearch } from './handlers/post-search';
import { postFetchStatus } from './handlers/post-fetch-status';
import { deleteAdminClear } from './handlers/delete-admin-clear';

export async function searchRoutes(fastify: FastifyInstance) {
  // Fetch flights for a specific source (triggers fetch job)
  fastify.post('/api/fetch/source/:source', async (request, reply) => {
    try {
      searchSchema.parse(request.body);
      return await postFetchSource(request, reply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      throw error;
    }
  });
  
  // Search (query) the database for existing results
  fastify.post('/api/search', async (request, reply) => {
    try {
      searchSchema.parse(request.body);
      return await postSearch(request, reply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      throw error;
    }
  });
  
  // Get aggregated fetch status for all sources (using request params)
  fastify.post('/api/fetch/status', async (request, reply) => {
    try {
      searchSchema.parse(request.body);
      return await postFetchStatus(request, reply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      throw error;
    }
  });
  
  // Clear all data endpoint
  fastify.delete('/api/admin/clear', async (request, reply) => {
    return await deleteAdminClear(request, reply);
  });
}

