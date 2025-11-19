import { useState, useCallback } from 'react';
import { SearchResult } from '../types';

export type SearchStatus = 'idle' | 'processing' | 'completed' | 'error';

interface UseSearchStateReturn {
  searchId: string | null;
  results: SearchResult[];
  status: SearchStatus;
  errorMessage: string | null;
  isSearching: boolean;
  setSearchId: (id: string | null) => void;
  setResults: (results: SearchResult[]) => void;
  setStatus: (status: SearchStatus) => void;
  setErrorMessage: (message: string | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  reset: () => void;
}

export function useSearchState(): UseSearchStateReturn {
  const [searchId, setSearchId] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const reset = useCallback(() => {
    setSearchId(null);
    setResults([]);
    setStatus('idle');
    setErrorMessage(null);
    setIsSearching(false);
  }, []);

  return {
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
  };
}

