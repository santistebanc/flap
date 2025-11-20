import { useCallback } from 'react';
import { SearchRequest } from '../types';
import { fetchFlights, searchFlights, createSSEStream, getFetchStatus } from '../services/api';
import { useSearchState, SearchStatus, JobStatus } from './useSearchState';

interface UseSearchReturn {
  searchId: string | null;
  results: ReturnType<typeof useSearchState>['results'];
  status: SearchStatus;
  errorMessage: string | null;
  isSearching: boolean;
  jobs: { [source: string]: JobStatus };
  handleFetch: (request: SearchRequest) => Promise<void>;
  handleSearch: (request: SearchRequest) => Promise<void>;
  updateJobs: (jobs: { [source: string]: JobStatus }) => void;
}

export function useSearch(): UseSearchReturn {
  const {
    searchId,
    results,
    status,
    errorMessage,
    isSearching,
    jobs,
    setSearchId,
    setResults,
    setStatus,
    setErrorMessage,
    setIsSearching,
    setJobs,
    reset,
  } = useSearchState();

  const handleSearch = useCallback(
    async (request: SearchRequest) => {
      try {
        setIsSearching(true);
        setErrorMessage(null);

        // Search DB for existing results
        const searchResults = await searchFlights(request);
        if (searchResults.results && searchResults.results.length > 0) {
          setResults(searchResults.results);
          setStatus('completed');
        } else {
          setResults([]);
          setStatus('completed');
        }

        // Also fetch job statuses to show in progress area
        try {
          const statusResponse = await getFetchStatus(request);
          if (statusResponse.jobs) {
            setJobs(statusResponse.jobs as { [source: string]: JobStatus });
          }
        } catch (error) {
          console.warn('Error fetching job statuses:', error);
          // Don't fail the search if status fetch fails
        }

        setIsSearching(false);
      } catch (error) {
        console.error('Error searching DB:', error);
        setIsSearching(false);
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'An unknown error occurred while searching'
        );
      }
    },
    [setIsSearching, setStatus, setErrorMessage, setResults, setJobs]
  );

  const handleFetch = useCallback(
    async (request: SearchRequest) => {
      try {
        setIsSearching(true);
        reset();
        setStatus('processing');
        setErrorMessage(null);

        // First, search DB for existing results
        try {
          const searchResults = await searchFlights(request);
          if (searchResults.results && searchResults.results.length > 0) {
            setResults(searchResults.results);
          }
        } catch (error) {
          console.warn('Error searching DB:', error);
          // Continue with fetch even if search fails
        }

        // Trigger fetch for all sources
        const response = await fetchFlights(request);
        setSearchId(response.searchId);

        // Set initial job statuses
        if (response.jobs) {
          setJobs(response.jobs as { [source: string]: JobStatus });
        }

        // If we have existing results from fetch response, merge them
        if (response.results && response.results.length > 0) {
          setResults(response.results);
        }

        // Set up SSE stream for real-time fetch updates
        const eventSource = createSSEStream(
          request,
          async (data) => {
            console.log('SSE update:', data);
            
            // Handle error from SSE
            if (data.error) {
              console.error('SSE error message:', data.error);
              setIsSearching(false);
              setStatus('error');
              setErrorMessage(data.error || 'Fetch error occurred');
              eventSource.close();
              return;
            }
            
            setStatus(data.status as SearchStatus);
            
            // Update job statuses if included in SSE update
            if (data.jobs) {
              setJobs(data.jobs as { [source: string]: JobStatus });
            }
            
            // When fetch completes, automatically search DB for results
            if (data.status === 'completed') {
              try {
                const searchResults = await searchFlights(request);
                if (searchResults.results && searchResults.results.length > 0) {
                  setResults(searchResults.results);
                } else {
                  // Use results from SSE if available
                  if (data.results !== undefined) {
                    setResults(data.results);
                  }
                }
              } catch (error) {
                console.error('Error searching DB after fetch:', error);
                // Use results from SSE if available
                if (data.results !== undefined) {
                  setResults(data.results);
                }
              }
              setIsSearching(false);
              setStatus('completed');
              eventSource.close();
            } else if (data.status === 'failed') {
              setIsSearching(false);
              setStatus('error');
              setErrorMessage('Fetch failed');
              eventSource.close();
            } else {
              // Update results during fetch if available
              if (data.results !== undefined) {
                setResults(data.results);
              }
            }
          },
          (error) => {
            console.error('SSE connection error:', error);
            // Don't immediately fail - the SSE might reconnect
            // Only fail if connection is actually closed
            if (error.message.includes('closed')) {
              setIsSearching(false);
              setStatus('error');
              setErrorMessage('Connection closed. Please try again.');
            }
          }
        );
      } catch (error) {
        console.error('Fetch error:', error);
        setIsSearching(false);
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'An unknown error occurred'
        );
      }
    },
    [setIsSearching, reset, setStatus, setErrorMessage, setSearchId, setResults, setJobs]
  );

  return {
    searchId,
    results,
    status,
    errorMessage,
    isSearching,
    jobs,
    handleFetch,
    handleSearch,
    updateJobs: setJobs,
  };
}

