import { useState } from 'react';
import { JobStatus } from './useSearchState';
import { SearchRequest } from '../types';
import { fetchSource, getFetchStatus } from '../services/api';
import { isValidRequest } from '../utils/jobStatus';

interface UseJobActionsProps {
  jobs: { [source: string]: JobStatus };
  searchRequest?: SearchRequest;
  onJobUpdate?: (updatedJobs: { [source: string]: JobStatus }) => void;
}

/**
 * Custom hook that handles job actions: fetch
 */
export function useJobActions({ jobs, searchRequest, onJobUpdate }: UseJobActionsProps) {
  const [searching, setSearching] = useState<string | null>(null);

  const handleFetch = async (source: string) => {
    if (!isValidRequest(searchRequest)) {
      alert('Please fill in all search fields (origin, destination, and departure date)');
      return;
    }

    setSearching(source);
    try {
      const response = await fetchSource(source, searchRequest!);

      // Update the job for this source with the response
      const updatedJobs = { ...jobs };
      const sourceSearchId = response.searchId;
      updatedJobs[source] = {
        jobId: response.job.jobId,
        status: response.job.status as JobStatus['status'],
        searchId: sourceSearchId,
      };

      // Refresh all job statuses to get latest info
      try {
        const statusResponse = await getFetchStatus(searchRequest!);
        if (statusResponse.jobs) {
          // Merge the updated jobs with the status response
          const jobs = statusResponse.jobs;
          Object.keys(jobs).forEach((key) => {
            updatedJobs[key] = jobs[key] as JobStatus;
          });
        }
      } catch (error) {
        console.warn('Failed to refresh job statuses:', error);
      }

      onJobUpdate?.(updatedJobs);
    } catch (error) {
      alert(`Failed to fetch ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSearching(null);
    }
  };

  return {
    searching,
    handleFetch,
  };
}

