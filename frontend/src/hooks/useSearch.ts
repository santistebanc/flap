import { useCallback } from 'react';
import { SearchRequest } from '../types';
import { submitSearch, createSSEStream, getSearchResults, getSearchStatus } from '../services/api';
import { useSearchState, SearchStatus } from './useSearchState';

interface UseSearchReturn {
  searchId: string | null;
  results: ReturnType<typeof useSearchState>['results'];
  status: SearchStatus;
  errorMessage: string | null;
  isSearching: boolean;
  handleSearch: (request: SearchRequest) => Promise<void>;
}

export function useSearch(): UseSearchReturn {
  const {
    searchId,
    results,
    status,
    errorMessage,
    isSearching,
    setSearchId,
    setResults,
    setStatus,
    setErrorMessage,
    setIsSearching,
    reset,
  } = useSearchState();

  const handleSearch = useCallback(
    async (request: SearchRequest) => {
      try {
        setIsSearching(true);
        reset();
        setStatus('processing');
        setErrorMessage(null);

        const response = await submitSearch(request);
        setSearchId(response.searchId);

        // If we have existing results, set them immediately
        if (response.results && response.results.length > 0) {
          setResults(response.results);
          if (response.status === 'completed') {
            setIsSearching(false);
            setStatus('completed');
            return; // Don't set up SSE if search is already completed
          }
        } else if (response.isExisting) {
          // Existing search but no results yet
          setResults([]);
        }

        // Set up SSE stream for real-time updates
        const eventSource = createSSEStream(
          response.searchId,
          async (data) => {
            console.log('SSE update:', data);
            
            // Handle error from SSE
            if (data.error) {
              console.error('SSE error message:', data.error);
              setIsSearching(false);
              setStatus('error');
              setErrorMessage(data.error || 'Search error occurred');
              eventSource.close();
              return;
            }
            
            setStatus(data.status as SearchStatus);
            
            // Update results if they're included in the SSE update
            if (data.results !== undefined) {
              setResults(data.results);
            }
            
            if (data.status === 'completed') {
              // If results weren't in SSE update, fetch them
              if (data.results === undefined) {
                try {
                  const resultsResponse = await getSearchResults(response.searchId);
                  setResults(resultsResponse.results || []);
                } catch (error) {
                  console.error('Error fetching results:', error);
                }
              }
              setIsSearching(false);
              setStatus('completed');
              eventSource.close();
            } else if (data.status === 'failed') {
              setIsSearching(false);
              setStatus('error');
              setErrorMessage('Search failed');
              eventSource.close();
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
        
        // Fallback: Poll for status if SSE doesn't work (after 30 seconds)
        let fallbackTimeout: NodeJS.Timeout | null = null;
        fallbackTimeout = setTimeout(async () => {
          console.log('SSE fallback: Polling for status');
          try {
            const statusResponse = await getSearchStatus(response.searchId);
            // Only process if search is still in progress (SSE might have failed silently)
            if (statusResponse.status === 'completed' || statusResponse.status === 'failed') {
              eventSource.close();
              if (statusResponse.status === 'completed') {
                const resultsResponse = await getSearchResults(response.searchId);
                if (resultsResponse.results && resultsResponse.results.length > 0) {
                  setResults(resultsResponse.results);
                  setStatus('completed');
                } else {
                  setResults([]);
                  setStatus('completed');
                }
              } else {
                setStatus('error');
                setErrorMessage('Search failed');
              }
              setIsSearching(false);
            }
          } catch (error) {
            console.error('Fallback polling error:', error);
          }
        }, 30000);
        
        // Clear fallback when search completes
        const originalClose = eventSource.close;
        eventSource.close = function() {
          if (fallbackTimeout) {
            clearTimeout(fallbackTimeout);
          }
          originalClose.call(this);
        };
      } catch (error) {
        console.error('Search error:', error);
        setIsSearching(false);
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'An unknown error occurred'
        );
      }
    },
    [setIsSearching, reset, setStatus, setErrorMessage, setSearchId, setResults]
  );

  return {
    searchId,
    results,
    status,
    errorMessage,
    isSearching,
    handleSearch,
  };
}

