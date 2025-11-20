import type { Deal, Flight, SearchResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SearchResponse {
  searchId: string;
  status: string;
  jobs: {
    [source: string]: {
      jobId: string;
      status: string;
      searchId: string;
      resultCount?: number;
      lastFetchedAt?: string;
      completedAt?: string;
    };
  };
  results?: SearchResult[];
  isExisting?: boolean;
}

export interface SearchStatus {
  searchId: string;
  status: string;
  jobs: {
    [source: string]: {
      jobId: string;
      status: string;
    };
  };
  results?: SearchResult[];
}

export interface SearchResults {
  searchId: string;
  results: Array<{
    tripId: string;
    deals: Deal[];
    flights: Flight[];
  }>;
}

export async function fetchFlights(request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): Promise<SearchResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to fetch flights: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend at ${API_BASE_URL}. Is the server running?`);
    }
    throw error;
  }
}

export async function searchFlights(request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): Promise<{ searchId: string; results: SearchResult[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to search flights: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend at ${API_BASE_URL}. Is the server running?`);
    }
    throw error;
  }
}

export async function getSearchStatus(searchId: string): Promise<SearchStatus> {
  const response = await fetch(`${API_BASE_URL}/api/search/${searchId}/status`);

  if (!response.ok) {
    throw new Error('Failed to get search status');
  }

  return response.json();
}

export async function getSearchResults(searchId: string): Promise<SearchResults> {
  const response = await fetch(`${API_BASE_URL}/api/search/${searchId}/results`);

  if (!response.ok) {
    throw new Error('Failed to get search results');
  }

  return response.json();
}

export function createSSEStream(
  request: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
  },
  onMessage: (data: SearchStatus) => void,
  onError: (error: Error) => void
): EventSource {
  const params = new URLSearchParams({
    origin: request.origin,
    destination: request.destination,
    departureDate: request.departureDate,
  });
  if (request.returnDate) {
    params.append('returnDate', request.returnDate);
  }
  
  const eventSource = new EventSource(`${API_BASE_URL}/api/fetch/stream?${params.toString()}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      onError(error as Error);
    }
  };

  eventSource.onerror = () => {
    // Only log error if connection is actually closed
    // SSE may fire error events during normal operation
    if (eventSource.readyState === EventSource.CLOSED) {
      onError(new Error('SSE connection closed'));
      eventSource.close();
    }
  };

  return eventSource;
}

export async function clearAllData(): Promise<{ success: boolean; deleted: number; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/clear`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to clear data');
  }

  return response.json();
}

export async function fetchSource(source: string, request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): Promise<{ searchId: string; status: string; job: { jobId: string; status: string; searchId?: string } }> {
  const response = await fetch(`${API_BASE_URL}/api/fetch/source/${source}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to fetch ${source}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getFetchStatus(request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): Promise<SearchStatus> {
  const response = await fetch(`${API_BASE_URL}/api/fetch/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to get fetch status');
  }

  return response.json();
}

export async function cancelFetch(sourceSearchId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/fetch/${sourceSearchId}/cancel`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to cancel fetch');
  }

  return response.json();
}

export async function retryFetch(sourceSearchId: string): Promise<{ success: boolean; jobId: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/fetch/${sourceSearchId}/retry`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to retry fetch');
  }

  return response.json();
}

