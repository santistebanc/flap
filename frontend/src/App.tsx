import { useState, useEffect, useRef } from 'react';
import { useSearch } from '@tanstack/react-router';
import { FlightResults } from './components/flights';
import { CompactHeader } from './components/CompactHeader';
import { ErrorMessage } from './components/ErrorMessage';
import { useSearch as useSearchHook } from './hooks/useSearch';
import { validateSearchRequest } from './schemas/searchParams';
import type { SearchRequest } from './types';

function App() {
  const searchParams = useSearch({ from: '/' });
  const { results, status, errorMessage, isSearching, jobs, handleSearch, updateJobs } = useSearchHook();
  const [currentSearchRequest, setCurrentSearchRequest] = useState<SearchRequest | undefined>();
  const lastSearchRef = useRef<string>('');

  // Trigger search (only query DB, don't fetch) when valid params are present
  useEffect(() => {
    // Validate search params using Zod schema
    const request = validateSearchRequest(searchParams);
    
    if (request) {
      // Create a unique key for this search to avoid duplicate searches
      const searchKey = `${request.origin}-${request.destination}-${request.departureDate}-${request.returnDate || ''}`;
      
      // Only trigger if params actually changed
      if (lastSearchRef.current !== searchKey) {
        lastSearchRef.current = searchKey;
        setCurrentSearchRequest(request);
        handleSearch(request);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.origin, searchParams.destination, searchParams.departureDate, searchParams.returnDate, searchParams.roundTrip]);

  const handleJobUpdate = (updatedJobs?: { [source: string]: any }) => {
    // Update jobs state when individual source fetches complete
    if (updatedJobs) {
      updateJobs(updatedJobs);
    }
  };

  // Check if any source has ever been fetched
  const hasAnySourceBeenFetched = Object.values(jobs).some(
    (job) => job && job.lastFetchedAt
  );

  return (
    <div className="min-h-screen bg-background">
      <CompactHeader 
        isLoading={isSearching} 
        jobs={jobs} 
        searchRequest={currentSearchRequest}
        onJobUpdate={handleJobUpdate}
        onResultsRefresh={() => {
          if (currentSearchRequest) {
            handleSearch(currentSearchRequest);
          }
        }}
      />

      {status === 'completed' && results.length === 0 && (
        <div className="container mx-auto px-4 py-8">
          <ErrorMessage
            title={hasAnySourceBeenFetched ? "No flights found" : "Not yet fetched"}
            message={hasAnySourceBeenFetched 
              ? "We couldn't find any flights matching your search criteria. Please try different dates or destinations."
              : "No flights have been fetched yet. Click the Fetch button for each source to start searching for flights."
            }
          />
        </div>
      )}

      {results.length > 0 && (
        <FlightResults results={results} />
      )}

      {status === 'error' && (
        <div className="container mx-auto px-4 py-8">
          <ErrorMessage
            title="An error occurred while fetching"
            message={errorMessage || 'An unknown error occurred'}
          />
        </div>
      )}
    </div>
  );
}

export default App;

