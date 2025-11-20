import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Loader2, CheckCircle2, XCircle, Clock, Search, X, RotateCw } from 'lucide-react';
import { JobStatus } from '../../hooks/useSearchState';
import { cancelFetch, retryFetch, fetchSource, getFetchStatus } from '../../services/api';
import { SearchRequest } from '../../types';

interface JobStatusIndicatorProps {
  jobs: { [source: string]: JobStatus };
  searchRequest?: SearchRequest;
  onJobUpdate?: (updatedJobs: { [source: string]: JobStatus }) => void;
  onResultsRefresh?: () => void;
}

export function JobStatusIndicator({ jobs, searchRequest, onJobUpdate, onResultsRefresh }: JobStatusIndicatorProps) {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [searching, setSearching] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Always show all sources, even if no jobs exist yet
  const sources = ['skyscanner', 'kiwi'];
  
  // Poll for job status updates when there are active jobs
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
      // Poll every 2 seconds for status updates
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await getFetchStatus(searchRequest);
          if (statusResponse.jobs) {
            // Check if any job just completed
            const previousJobs = jobs;
            const newJobs = statusResponse.jobs as { [source: string]: JobStatus };
            let jobJustCompleted = false;
            
            Object.keys(newJobs).forEach(key => {
              const newJob = newJobs[key];
              const oldJob = previousJobs[key];
              
              // Check if a job just transitioned to completed
              if (newJob && newJob.jobId && 
                  newJob.status === 'completed' && 
                  (!oldJob || oldJob.status !== 'completed')) {
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
      }, 2000);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [jobs, searchRequest, onJobUpdate]);
  
  // Create entries for all sources, using job data if available
  const sourceEntries = sources.map(source => {
    const job = jobs[source];
    // A job only exists if it has a jobId (meaning a fetch was actually started)
    const hasJob = !!(job && job.jobId);
    return [source, job || { status: 'pending' as const }, hasJob] as [string, JobStatus | { status: 'pending' }, boolean];
  });

  const getStatusIcon = (status: string, hasJob: boolean) => {
    // If no job exists, don't show any status icon
    if (!hasJob) {
      return null;
    }
    
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'active':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string, hasJob: boolean) => {
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
  };

  const getStatusColor = (status: string) => {
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
  };

  const capitalizeSource = (source: string) => {
    return source.charAt(0).toUpperCase() + source.slice(1);
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);

      if (diffSeconds < 60) {
        return 'just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      } else if (diffWeeks < 4) {
        return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
      } else if (diffMonths < 12) {
        return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
      } else {
        return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
      }
    } catch {
      return null;
    }
  };

  const handleCancel = async (source: string, sourceSearchId?: string) => {
    if (!sourceSearchId || !searchRequest) return;
    
    setCancelling(source);
    try {
      await cancelFetch(sourceSearchId);
      
      // Refresh all job statuses to get the updated status
      try {
        const statusResponse = await getFetchStatus(searchRequest);
        if (statusResponse.jobs && onJobUpdate) {
          onJobUpdate(statusResponse.jobs as { [source: string]: JobStatus });
        }
      } catch (error) {
        console.warn('Failed to refresh job statuses after cancel:', error);
        // Still update with what we know - the job was cancelled
        if (onJobUpdate) {
          const updatedJobs = { ...jobs };
          updatedJobs[source] = {
            ...jobs[source],
            status: 'failed' as const,
          };
          onJobUpdate(updatedJobs);
        }
      }
    } catch (error) {
      alert(`Failed to cancel fetch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCancelling(null);
    }
  };

  const handleRetry = async (source: string, sourceSearchId?: string) => {
    if (!sourceSearchId || !searchRequest) return;
    
    setRetrying(source);
    try {
      await retryFetch(sourceSearchId);
      
      // Refresh all job statuses to get the updated status
      try {
        const statusResponse = await getFetchStatus(searchRequest);
        if (statusResponse.jobs && onJobUpdate) {
          onJobUpdate(statusResponse.jobs as { [source: string]: JobStatus });
        }
      } catch (error) {
        console.warn('Failed to refresh job statuses after retry:', error);
        // Still update with what we know - the job was retried
        if (onJobUpdate) {
          const updatedJobs = { ...jobs };
          updatedJobs[source] = {
            ...jobs[source],
            status: 'pending' as const,
            jobId: jobs[source]?.jobId || '',
          };
          onJobUpdate(updatedJobs);
        }
      }
    } catch (error) {
      alert(`Failed to retry fetch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRetrying(null);
    }
  };

  const isValidRequest = (request?: SearchRequest): boolean => {
    return !!(
      request &&
      request.origin &&
      request.destination &&
      request.departureDate &&
      request.origin.length === 3 &&
      request.destination.length === 3
    );
  };

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
          Object.keys(statusResponse.jobs).forEach(key => {
            updatedJobs[key] = statusResponse.jobs[key] as JobStatus;
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

  return (
    <div className="space-y-2">
      {sourceEntries.map(([source, job, hasJob]) => (
        <div
          key={source}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/50 text-xs"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon(job.status, hasJob)}
            <span className="font-medium whitespace-nowrap">{capitalizeSource(source)}</span>
            <span className={getStatusColor(job.status)}>
              {getStatusText(job.status, hasJob)}
            </span>
            
            {job.resultCount !== undefined && (
              <span className="text-muted-foreground">
                • {job.resultCount} {job.resultCount === 1 ? 'result' : 'results'}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            {job.status === 'active' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCancel(source, job.searchId)}
                disabled={!job.searchId || cancelling === source}
                className="h-7 px-2.5 text-xs"
                title="Cancel fetch"
              >
                {cancelling === source ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </>
                )}
              </Button>
            ) : job.status === 'pending' && hasJob ? (
              // Job exists but is pending - can cancel or start new
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel(source, job.searchId)}
                  disabled={!job.searchId || cancelling === source}
                  className="h-7 px-2.5 text-xs"
                  title="Cancel fetch"
                >
                  {cancelling === source ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancel
                    </>
                  )}
                </Button>
                 <Button
                   type="button"
                   variant="default"
                   size="sm"
                   onClick={() => handleFetch(source)}
                   disabled={!isValidRequest(searchRequest) || searching === source}
                   className="h-7 px-2.5 text-xs"
                   title="Start new fetch"
                 >
                   {searching === source ? (
                     <Loader2 className="h-3.5 w-3.5 animate-spin" />
                   ) : (
                     <>
                       <Search className="h-3.5 w-3.5 mr-1" />
                       Fetch
                     </>
                   )}
                 </Button>
               </>
             ) : job.status === 'failed' ? (
               <>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => handleRetry(source, job.searchId)}
                   disabled={!job.searchId || retrying === source}
                   className="h-7 px-2.5 text-xs"
                   title="Retry fetch"
                 >
                   {retrying === source ? (
                     <Loader2 className="h-3.5 w-3.5 animate-spin" />
                   ) : (
                     <>
                       <RotateCw className="h-3.5 w-3.5 mr-1" />
                       Retry
                     </>
                   )}
                 </Button>
                 {job.lastFetchedAt && (
                   <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                     {formatDateTime(job.lastFetchedAt)}
                   </span>
                 )}
                 <Button
                   type="button"
                   variant="default"
                   size="sm"
                   onClick={() => handleFetch(source)}
                   disabled={!isValidRequest(searchRequest) || searching === source}
                   className="h-7 px-2.5 text-xs"
                   title="Start new fetch"
                 >
                   {searching === source ? (
                     <Loader2 className="h-3.5 w-3.5 animate-spin" />
                   ) : (
                     <>
                       <Search className="h-3.5 w-3.5 mr-1" />
                       Fetch
                     </>
                   )}
                 </Button>
               </>
             ) : job.status === 'completed' ? (
               <>
                 {job.lastFetchedAt && (
                   <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                     {formatDateTime(job.lastFetchedAt)}
                   </span>
                 )}
                 <Button
                   type="button"
                   variant="default"
                   size="sm"
                   onClick={() => handleFetch(source)}
                   disabled={!isValidRequest(searchRequest) || searching === source}
                   className="h-7 px-2.5 text-xs"
                   title="Start new fetch"
                 >
                   {searching === source ? (
                     <Loader2 className="h-3.5 w-3.5 animate-spin" />
                   ) : (
                     <>
                       <Search className="h-3.5 w-3.5 mr-1" />
                       Fetch
                     </>
                   )}
                 </Button>
               </>
             ) : (
               // No job yet - show start fetch button
               <>
                 {job.lastFetchedAt && (
                   <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                     {formatDateTime(job.lastFetchedAt)}
                   </span>
                 )}
                 <Button
                   type="button"
                   variant="default"
                   size="sm"
                   onClick={() => handleFetch(source)}
                   disabled={!isValidRequest(searchRequest) || searching === source}
                   className="h-7 px-2.5 text-xs"
                   title="Start fetch"
                 >
                   {searching === source ? (
                     <Loader2 className="h-3.5 w-3.5 animate-spin" />
                   ) : (
                     <>
                       <Search className="h-3.5 w-3.5 mr-1" />
                       Fetch
                     </>
                   )}
                 </Button>
               </>
             )}
          </div>
        </div>
      ))}
    </div>
  );
}
