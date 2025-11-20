import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { addFlightJob, flightQueue } from '../services/queue';
import { 
  storeSearchJob, 
  getSearchJob, 
  getDealsByTrip, 
  getLegsByTrip, 
  getFlight, 
  getSearchTrips,
  clearAllData,
} from '../utils/redis';
import { generateSearchId, generateSourceSearchId } from '../utils/ids';

const searchSchema = z.object({
  origin: z.string().min(3).max(3),
  destination: z.string().min(3).max(3),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function searchRoutes(fastify: FastifyInstance) {
  // Helper function to get search results
  async function getSearchResultsData(searchId: string) {
    // Get trips associated with this search
    const tripIds = await getSearchTrips(searchId);
    
    if (tripIds.length === 0) {
      return [];
    }
    
    // Get all deals for these trips
    const deals = [];
    for (const tripId of tripIds) {
      const tripDeals = await getDealsByTrip(tripId);
      deals.push(...tripDeals);
    }
    
    // Get trips with legs and flights
    const results = [];
    for (const tripId of tripIds) {
      const legs = await getLegsByTrip(tripId);
      const tripDeals = deals.filter((d) => d.trip === tripId);
      
      const tripFlights = [];
      for (const leg of legs) {
        const flight = await getFlight(leg.flight);
        if (flight) {
          tripFlights.push({
            ...flight,
            leg: leg,
          });
        }
      }
      
      if (tripDeals.length > 0 || tripFlights.length > 0) {
        results.push({
          tripId,
          deals: tripDeals,
          flights: tripFlights,
        });
      }
    }
    
    return results;
  }

  // Helper function to aggregate results from multiple source searches
  async function aggregateSourceResults(sources: string[], request: SearchRequest) {
    const allResults: any[] = [];
    const seenTripIds = new Set<string>();
    
    for (const source of sources) {
      const sourceSearchId = generateSourceSearchId(source, request);
      const sourceResults = await getSearchResultsData(sourceSearchId);
      
      for (const result of sourceResults) {
        if (!seenTripIds.has(result.tripId)) {
          seenTripIds.add(result.tripId);
          allResults.push(result);
        } else {
          // Merge deals from this source into existing trip
          const existingResult = allResults.find(r => r.tripId === result.tripId);
          if (existingResult) {
            existingResult.deals.push(...result.deals);
          }
        }
      }
    }
    
    return allResults;
  }

  // Fetch flights for all sources (triggers fetch jobs)
  fastify.post('/api/fetch', async (request, reply) => {
    try {
      const body = searchSchema.parse(request.body);
      
      const sources = ['skyscanner', 'kiwi'];
      
      // Create/update individual source searches
      const jobs: { [source: string]: { jobId: string; status: string; searchId: string } } = {};
      const sourceSearchIds: { [source: string]: string } = {};
      
      for (const source of sources) {
        const sourceSearchId = generateSourceSearchId(source, body);
        sourceSearchIds[source] = sourceSearchId;
        
        // Check if source search already exists
        const existingSourceJob = await getSearchJob(sourceSearchId) as any;
        
        if (existingSourceJob) {
          const needsRefresh = !existingSourceJob.job ||
                               existingSourceJob.job.status !== 'completed' ||
                               !existingSourceJob.job.completedAt;
          
          if (needsRefresh) {
            // Create new job for this source
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
            jobs[source] = {
              jobId,
              status: 'pending',
              searchId: sourceSearchId,
            };
          } else {
            // Use existing job
            jobs[source] = {
              jobId: existingSourceJob.job.jobId,
              status: existingSourceJob.job.status,
              searchId: sourceSearchId,
            };
          }
        } else {
          // Create new source search
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
          jobs[source] = {
            jobId,
            status: 'pending',
            searchId: sourceSearchId,
          };
        }
      }
      
      // Search DB for existing results (if any fetches have completed)
      const results = await aggregateSourceResults(sources, body);
      
      // Return response with all source fetch jobs
      return reply.code(201).send({
        searchId: generateSearchId(body), // Meta search ID for frontend reference
        status: 'processing',
        jobs: jobs,
        results: results, // Return any existing results from DB
        isExisting: false,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      console.error('Error creating search:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Fetch flights for a specific source (triggers fetch job)
  fastify.post('/api/fetch/source/:source', async (request, reply) => {
    try {
      const { source } = request.params as { source: string };
      const body = searchSchema.parse(request.body);
      
      const sourceSearchId = generateSourceSearchId(source, body);
      
      // Always create a new job when explicitly requested (user clicked fetch button)
      // This allows fetching even if it was done recently
      
      // Create new job for this source
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
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      console.error('Error creating source search:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Search (query) the database for existing results
  fastify.post('/api/search', async (request, reply) => {
    try {
      const body = searchSchema.parse(request.body);
      const sources = ['skyscanner', 'kiwi'];
      
      // Aggregate results from all source searches
      const results = await aggregateSourceResults(sources, body);
      
      return reply.send({
        searchId: generateSearchId(body),
        results: results,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      console.error('Error searching database:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get aggregated fetch status for all sources (using request params)
  fastify.post('/api/fetch/status', async (request, reply) => {
    try {
      const body = searchSchema.parse(request.body);
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
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      console.error('Error getting search status:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get fetch results for a specific source fetch
  fastify.get('/api/fetch/:searchId/results', async (request, reply) => {
    try {
      const { searchId } = request.params as { searchId: string };
      const fetchJob = await getSearchJob(searchId);
      
      if (!fetchJob) {
        return reply.code(404).send({ error: 'Fetch not found' });
      }
      
      const results = await getSearchResultsData(searchId);
      
      return reply.send({
        searchId,
        results,
      });
    } catch (error) {
      console.error('Error getting fetch results:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // SSE stream for aggregated fetch updates (using query params)
  fastify.get('/api/fetch/stream', async (request, reply) => {
    const query = request.query as any;
    const body = searchSchema.parse({
      origin: query.origin,
      destination: query.destination,
      departureDate: query.departureDate,
      returnDate: query.returnDate || undefined,
    });
    const sources = ['skyscanner', 'kiwi'];
    
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send initial message immediately
    const sendUpdate = async () => {
      try {
        const jobs: { [source: string]: any } = {};
        const allSourceResults: any[] = [];
        const seenTripIds = new Set<string>();
        
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
            
            // Get results for this source
            const sourceResults = await getSearchResultsData(sourceSearchId);
            for (const result of sourceResults) {
              if (!seenTripIds.has(result.tripId)) {
                seenTripIds.add(result.tripId);
                allSourceResults.push(result);
              } else {
                const existingResult = allSourceResults.find(r => r.tripId === result.tripId);
                if (existingResult) {
                  existingResult.deals.push(...result.deals);
                }
              }
            }
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
        
        reply.raw.write(`data: ${JSON.stringify({
          searchId: generateSearchId(body),
          status: allCompleted ? 'completed' : 'processing',
          jobs: jobs,
          results: allSourceResults,
        })}\n\n`);
        
        return allCompleted;
      } catch (error) {
        console.error('Error in SSE stream:', error);
        reply.raw.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
        return true; // Stop on error
      }
    };
    
    // Send initial update immediately
    const shouldStop = await sendUpdate();
    if (shouldStop) {
      reply.raw.end();
      return;
    }
    
    const interval = setInterval(async () => {
      const shouldStop = await sendUpdate();
      if (shouldStop) {
        clearInterval(interval);
        reply.raw.end();
      }
    }, 1000); // Send update every second
    
    request.raw.on('close', () => {
      clearInterval(interval);
      reply.raw.end();
    });
  });
  
  // Cancel a fetch job for a specific source (using source searchId)
  fastify.post('/api/fetch/:searchId/cancel', async (request, reply) => {
    try {
      const { searchId } = request.params as { searchId: string };
      
      const sourceSearchJob = await getSearchJob(searchId) as any;
      if (!sourceSearchJob) {
        return reply.code(404).send({ error: 'Search not found' });
      }
      
      const job = sourceSearchJob.job;
      if (!job) {
        return reply.code(404).send({ error: 'Job not found' });
      }
      
      // Remove job from BullMQ queue if it's pending or active
      if (job.status === 'pending' || job.status === 'active') {
        try {
          const bullJob = await flightQueue.getJob(job.jobId);
          if (bullJob) {
            await bullJob.remove();
            console.log(`Cancelled job ${job.jobId}`);
          }
        } catch (error) {
          console.warn(`Could not remove job ${job.jobId} from queue:`, error);
        }
      }
      
      // Update job status to failed
      sourceSearchJob.job.status = 'failed';
      await storeSearchJob(sourceSearchJob);
      
      return reply.send({ success: true, message: 'Job cancelled' });
    } catch (error) {
      console.error('Error cancelling job:', error);
      return reply.code(500).send({ error: 'Failed to cancel job' });
    }
  });
  
  // Retry a fetch job for a specific source (using source searchId)
  fastify.post('/api/fetch/:searchId/retry', async (request, reply) => {
    try {
      const { searchId } = request.params as { searchId: string };
      
      const sourceSearchJob = await getSearchJob(searchId) as any;
      if (!sourceSearchJob) {
        return reply.code(404).send({ error: 'Search not found' });
      }
      
      if (!sourceSearchJob.request) {
        return reply.code(400).send({ error: 'Search request not found' });
      }
      
      // Create a new job for this source
      const jobId = await addFlightJob(searchId, sourceSearchJob.source, sourceSearchJob.request);
      
      // Update source search job with new job
      sourceSearchJob.job = {
        jobId,
        status: 'pending',
      };
      await storeSearchJob(sourceSearchJob);
      
      return reply.send({ success: true, jobId, message: 'Job retried' });
    } catch (error) {
      console.error('Error retrying job:', error);
      return reply.code(500).send({ error: 'Failed to retry job' });
    }
  });
  
  // Clear all data endpoint
  fastify.delete('/api/admin/clear', async (request, reply) => {
    try {
      const result = await clearAllData();
      console.log(`Cleared ${result.deleted} keys from Redis`);
      return reply.send({
        success: true,
        deleted: result.deleted,
        message: `Successfully cleared ${result.deleted} keys`,
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to clear data' 
      });
    }
  });
}

