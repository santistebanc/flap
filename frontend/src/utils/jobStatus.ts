import { JobStatus } from '../hooks/useSearchState';
import { SearchRequest } from '../types';

export type JobStatusType = JobStatus['status'];

/**
 * Gets the text label for a job status
 */
export function getStatusText(status: string, hasJob: boolean): string {
  if (!hasJob && status === 'pending') {
    return 'Ready';
  }
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'active':
      return 'Processing';
    case 'pending':
      return 'Pending';
    default:
      return 'Ready';
  }
}

/**
 * Gets the CSS color class for a job status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-600';
    case 'failed':
      return 'text-red-600';
    case 'active':
      return 'text-blue-600';
    case 'pending':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Capitalizes the first letter of a source name
 */
export function capitalizeSource(source: string): string {
  return source.charAt(0).toUpperCase() + source.slice(1);
}

/**
 * Validates a search request
 */
import { validateSearchRequest as zodValidateSearchRequest } from '../schemas/searchParams';

export function isValidRequest(request?: SearchRequest): boolean {
  if (!request) return false;
  return zodValidateSearchRequest(request) !== null;
}

