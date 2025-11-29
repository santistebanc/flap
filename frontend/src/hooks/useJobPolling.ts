import { useEffect, useRef } from 'react';
import { JobStatus } from './useSearchState';
import { SearchRequest } from '../types';
import { getFetchStatus } from '../services/api';

interface UseJobPollingProps {
  jobs: { [source: string]: JobStatus };
  searchRequest?: SearchRequest;
  onJobUpdate?: (updatedJobs: { [source: string]: JobStatus }) => void;
  onResultsRefresh?: () => void;
  pollInterval?: number;
}

/**
 * Custom hook that polls for job status updates when there are active jobs
 */
export function useJobPolling({
  jobs,
  searchRequest,
  onJobUpdate,
  onResultsRefresh,
  pollInterval = 2000,
}: UseJobPollingProps) {
  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!searchRequest || !onJobUpdate) return;

    // Check if there are any active or pending jobs
    const hasActiveJobs = Object.values(jobs).some(
      (job) => job && job.jobId && (job.status === 'active' || job.status === 'pending')
    );

    // Clean up any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (hasActiveJobs) {
      // Poll every N seconds for status updates
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await getFetchStatus(searchRequest);
          if (statusResponse.jobs) {
            // Check if any job just completed
            const previousJobs = jobs;
            const newJobs = statusResponse.jobs as { [source: string]: JobStatus };
            let jobJustCompleted = false;

            Object.keys(newJobs).forEach((key) => {
              const newJob = newJobs[key];
              const oldJob = previousJobs[key];

              // Check if a job just transitioned to completed
              if (
                newJob &&
                newJob.jobId &&
                newJob.status === 'completed' &&
                (!oldJob || oldJob.status !== 'completed')
              ) {
                jobJustCompleted = true;
              }
            });

            // Always update with latest status from server
            onJobUpdate?.(newJobs);

            // If a job just completed, refresh results
            if (jobJustCompleted && onResultsRefresh) {
              onResultsRefresh();
            }
          }
        } catch (error) {
          console.warn('Error polling job statuses:', error);
        }
      }, pollInterval);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [jobs, searchRequest, onJobUpdate, onResultsRefresh, pollInterval]);
}

