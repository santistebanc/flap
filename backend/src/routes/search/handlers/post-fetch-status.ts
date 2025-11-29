/**
 * POST /api/fetch/status - Get aggregated fetch status for all sources
 */
import { FastifyReply, FastifyRequest } from 'fastify';
import { getSearchJob } from '../../../utils/redis';
import { generateSearchId, generateSourceSearchId } from '../../../utils/ids';

export async function postFetchStatus(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = request.body as { origin: string; destination: string; departureDate: string; returnDate?: string };
    const sources = ['skyscanner', 'kiwi'];
    
    const jobs: { [source: string]: any } = {};
    
    for (const source of sources) {
      const sourceSearchId = generateSourceSearchId(source, body);
      const sourceSearchJob = await getSearchJob(sourceSearchId) as any;
      
      if (sourceSearchJob && sourceSearchJob.job) {
        jobs[source] = {
          jobId: sourceSearchJob.job.jobId,
          status: sourceSearchJob.job.status,
          searchId: sourceSearchId,
          resultCount: sourceSearchJob.job.resultCount,
          lastFetchedAt: sourceSearchJob.job.lastFetchedAt,
          completedAt: sourceSearchJob.job.completedAt,
        };
      } else {
        jobs[source] = {
          status: 'pending',
          searchId: sourceSearchId,
        };
      }
    }
    
    const allCompleted = Object.values(jobs).every(
      (job: any) => job?.status === 'completed' || job?.status === 'failed'
    );
    
    return reply.send({
      searchId: generateSearchId(body),
      status: allCompleted ? 'completed' : 'processing',
      jobs: jobs,
    });
  } catch (error) {
    console.error('Error getting search status:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

