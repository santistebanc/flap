import type { SearchResult } from '../types';
import {
  searchResultsSchema,
  fetchSourceResponseSchema,
  clearDataResponseSchema,
} from '../schemas/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

    const data = await response.json();
    return searchResultsSchema.parse(data);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend at ${API_BASE_URL}. Is the server running?`);
    }
    throw error;
  }
}

export async function clearAllData(): Promise<{ success: boolean; deleted: number; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/clear`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to clear data');
  }

  const data = await response.json();
  return clearDataResponseSchema.parse(data);
}

export async function fetchSource(source: string, request: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}): Promise<{ fetchId: string; status: string; job: { jobId: string; status: string; fetchId?: string } }> {
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

  const data = await response.json();
  return fetchSourceResponseSchema.parse(data);
}

