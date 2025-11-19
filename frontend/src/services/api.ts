import type { Deal, Flight, SearchResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SearchResponse {
  searchId: string;
  status: string;
  jobs: {
    [source: string]: {
      jobId: string;
      status: string;
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

export async function submitSearch(request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): Promise<SearchResponse> {
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
      throw new Error(errorData.error || `Failed to submit search: ${response.status} ${response.statusText}`);
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
  searchId: string,
  onMessage: (data: SearchStatus) => void,
  onError: (error: Error) => void
): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/api/search/${searchId}/stream`);

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

