import React, { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchRequest } from '../types';
import { searchFlights } from '../services/api';
import { useSearchState, SearchStatus, JobStatus } from './useSearchState';

interface UseSearchReturn {
  searchId: string | null;
  results: ReturnType<typeof useSearchState>['results'];
  status: SearchStatus;
  errorMessage: string | null;
  isSearching: boolean;
  jobs: { [source: string]: JobStatus };
  handleSearch: (request: SearchRequest) => Promise<void>;
  updateJobs: (jobs: { [source: string]: JobStatus }) => void;
}

export function useSearch(): UseSearchReturn {
  const {
    searchId,
    results: stateResults,
    status: stateStatus,
    errorMessage: stateErrorMessage,
    isSearching: stateIsSearching,
    jobs: stateJobs,
    setSearchId,
    setResults,
    setStatus,
    setErrorMessage,
    setIsSearching,
    setJobs,
    reset,
  } = useSearchState();

  const [currentSearchRequest, setCurrentSearchRequest] = React.useState<SearchRequest | null>(null);

  // Use React Query for search
  const searchQuery = useQuery({
    queryKey: ['search', currentSearchRequest],
    queryFn: async () => {
      if (!currentSearchRequest) return { results: [] };
      return await searchFlights(currentSearchRequest);
    },
    enabled: !!currentSearchRequest,
    staleTime: 5000,
  });

  // Sync React Query results to local state
  useEffect(() => {
    if (searchQuery.data?.results) {
      setResults(searchQuery.data.results);
      setStatus('completed');
    }
  }, [searchQuery.data, setResults, setStatus]);

  const handleSearch = useCallback(
    async (request: SearchRequest) => {
      setCurrentSearchRequest(request);
      // React Query will automatically fetch
    },
    []
  );

  // Determine final state - prefer React Query state, fallback to local state
  const results = searchQuery.data?.results || stateResults;
  const status = 
    searchQuery.isFetching ? 'processing' :
    searchQuery.isError ? 'error' :
    stateStatus;
  const errorMessage = 
    searchQuery.error instanceof Error ? searchQuery.error.message :
    stateErrorMessage;
  const isSearching = searchQuery.isFetching || stateIsSearching;
  const jobs = stateJobs;

  return {
    searchId,
    results,
    status,
    errorMessage,
    isSearching,
    jobs,
    handleSearch,
    updateJobs: setJobs,
  };
}

