/**
 * Aggregate results from multiple source searches, deduplicating by trip ID
 */
import { groupBy, flatten } from 'lodash-es';
import { getSearchResultsData, SearchResult } from './get-search-results';

export async function aggregateSourceResults(
  sources: string[],
  request: any
): Promise<SearchResult[]> {
  // Fetch all results from all sources
  const allSourceResults = await Promise.all(
    sources.map(async (source) => {
      return await getSearchResultsData(request, source);
    })
  );
  
  // Flatten all results
  const flatResults = flatten(allSourceResults);
  
  // Group by tripId
  const groupedByTripId = groupBy(flatResults, 'tripId');
  
  // Merge deals for each trip
  return Object.values(groupedByTripId).map((results) => {
    const firstResult = results[0];
    const mergedDeals = flatten(results.map(r => r.deals));
    return {
      ...firstResult,
      deals: mergedDeals,
    };
  });
}

