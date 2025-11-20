import { useState, useCallback } from 'react';
import { SearchResult } from '../types';

export type SearchStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface JobStatus {
  jobId?: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  searchId?: string;
  completedAt?: string;
  resultCount?: number;
  lastFetchedAt?: string;
}

interface UseSearchStateReturn {
  searchId: string | null;
  results: SearchResult[];
  status: SearchStatus;
  errorMessage: string | null;
  isSearching: boolean;
  jobs: { [source: string]: JobStatus };
  setSearchId: (id: string | null) => void;
  setResults: (results: SearchResult[]) => void;
  setStatus: (status: SearchStatus) => void;
  setErrorMessage: (message: string | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  setJobs: (jobs: { [source: string]: JobStatus }) => void;
  reset: () => void;
}

export function useSearchState(): UseSearchStateReturn {
  const [searchId, setSearchId] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs] = useState<{ [source: string]: JobStatus }>({});

  const reset = useCallback(() => {
    setSearchId(null);
    setResults([]);
    setStatus('idle');
    setErrorMessage(null);
    setIsSearching(false);
    setJobs({});
  }, []);

  return {
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
  };
}

