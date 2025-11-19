import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { addFlightJob } from '../services/queue';
import { 
  storeSearchJob, 
  getSearchJob, 
  getDealsByTrip, 
  getLegsByTrip, 
  getFlight, 
  getSearchTrips,
  clearAllData,
} from '../utils/redis';
import { generateSearchId } from '../utils/ids';

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

  // Submit a new search
  fastify.post('/api/search', async (request, reply) => {
    try {
      const body = searchSchema.parse(request.body);
      
      // Generate deterministic searchId from search parameters
      const searchId = generateSearchId(body);
      
      const sources = ['skyscanner', 'kiwi'];
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 hours in milliseconds
      
      // Check if search already exists
      const existingSearchJob = await getSearchJob(searchId) as any;
      
      if (existingSearchJob) {
        // Get existing results
        const existingResults = await getSearchResultsData(searchId);
        
        // Check which sources need refreshing (outdated or never completed)
        const jobsToRefresh: string[] = [];
        const currentJobs = existingSearchJob.jobs || {};
        
        for (const source of sources) {
          const job = currentJobs[source];
          const needsRefresh = !job || 
                               job.status !== 'completed' || 
                               !job.completedAt || 
                               new Date(job.completedAt).getTime() < oneDayAgo;
          
          if (needsRefresh) {
            jobsToRefresh.push(source);
          }
        }
        
        // If all sources are fresh, return existing results
        if (jobsToRefresh.length === 0) {
          console.log(`Found existing search ${searchId} with fresh results (${existingResults.length} results)`);
          
          return reply.code(200).send({
            searchId: searchId,
            status: existingSearchJob.status,
            jobs: currentJobs,
            results: existingResults,
            isExisting: true,
          });
        }
        
        // Some sources need refreshing - create jobs for outdated sources
        console.log(`Found existing search ${searchId}, refreshing ${jobsToRefresh.length} outdated sources: ${jobsToRefresh.join(', ')}`);
        
        const updatedJobs = { ...currentJobs };
        
        // Create jobs for outdated sources
        for (const source of jobsToRefresh) {
          const jobId = await addFlightJob(searchId, source, body);
          updatedJobs[source] = {
            jobId,
            status: 'pending',
          };
        }
        
        // Update search job with new jobs
        existingSearchJob.jobs = updatedJobs;
        existingSearchJob.status = 'processing';
        await storeSearchJob(existingSearchJob);
        
        return reply.code(200).send({
          searchId: searchId,
          status: 'processing',
          jobs: updatedJobs,
          results: existingResults,
          isExisting: true,
          refreshingSources: jobsToRefresh,
        });
      }
      
      // Create new search
      const jobs: { [source: string]: { jobId: string; status: string } } = {};
      
      // Create jobs for each source
      for (const source of sources) {
        const jobId = await addFlightJob(searchId, source, body);
        jobs[source] = {
          jobId,
          status: 'pending',
        };
      }
      
      const searchJob = {
        searchId,
        request: body,
        sources,
        status: 'processing',
        jobs,
        createdAt: new Date().toISOString(),
      };
      
      await storeSearchJob(searchJob);
      
      // Return initial empty results
      return reply.code(201).send({
        searchId,
        status: 'processing',
        jobs,
        results: [],
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
  
  // Get search status
  fastify.get('/api/search/:searchId/status', async (request, reply) => {
    try {
      const { searchId } = request.params as { searchId: string };
      const searchJob = await getSearchJob(searchId) as any;
      
      if (!searchJob) {
        return reply.code(404).send({ error: 'Search not found' });
      }
      
      // Check if all jobs are completed
      const jobs = searchJob.jobs || {};
      const allCompleted = Object.values(jobs).every(
        (job: any) => job?.status === 'completed' || job?.status === 'failed'
      );
      
      if (allCompleted && searchJob.status !== 'completed') {
        searchJob.status = 'completed';
        await storeSearchJob(searchJob);
      }
      
      return reply.send({
        searchId: searchJob.searchId,
        status: searchJob.status,
        jobs: jobs,
      });
    } catch (error) {
      console.error('Error getting search status:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get search results
  fastify.get('/api/search/:searchId/results', async (request, reply) => {
    try {
      const { searchId } = request.params as { searchId: string };
      const searchJob = await getSearchJob(searchId);
      
      if (!searchJob) {
        return reply.code(404).send({ error: 'Search not found' });
      }
      
      const results = await getSearchResultsData(searchId);
      
      return reply.send({
        searchId,
        results,
      });
    } catch (error) {
      console.error('Error getting search results:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // SSE stream for real-time updates
  fastify.get('/api/search/:searchId/stream', async (request, reply) => {
    const { searchId } = request.params as { searchId: string };
    
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send initial message immediately
    const sendUpdate = async () => {
      try {
        const searchJob = await getSearchJob(searchId) as any;
        
        if (!searchJob) {
          reply.raw.write(`data: ${JSON.stringify({ error: 'Search not found' })}\n\n`);
          return false;
        }
        
        // Check if all jobs are completed
        const jobs = searchJob.jobs || {};
        const allCompleted = Object.values(jobs).every(
          (job: any) => job?.status === 'completed' || job?.status === 'failed'
        );
        
        if (allCompleted && searchJob.status !== 'completed') {
          searchJob.status = 'completed';
          await storeSearchJob(searchJob);
        }
        
        // Get current results
        const results = await getSearchResultsData(searchId);
        
        reply.raw.write(`data: ${JSON.stringify({
          searchId: searchJob.searchId,
          status: searchJob.status,
          jobs: jobs,
          results: results,
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

