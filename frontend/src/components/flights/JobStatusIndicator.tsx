import { JobStatus } from '../../hooks/useSearchState';
import { SearchRequest } from '../../types';
import { useJobActions } from '../../hooks/useJobActions';
import { JobStatusRow } from './JobStatusRow';

interface JobStatusIndicatorProps {
  jobs: { [source: string]: JobStatus };
  searchRequest?: SearchRequest;
  onJobUpdate?: (updatedJobs: { [source: string]: JobStatus }) => void;
  onResultsRefresh?: () => void;
}

/**
 * Main component that displays job status indicators for all sources
 */
export function JobStatusIndicator({
  jobs,
  searchRequest,
  onJobUpdate,
  onResultsRefresh,
}: JobStatusIndicatorProps) {
  // Handle job actions (fetch)
  const { searching, handleFetch } = useJobActions({
    jobs,
    searchRequest,
    onJobUpdate,
  });

  // Always show all sources, even if no jobs exist yet
  const sources = ['skyscanner', 'kiwi'];

  // Create entries for all sources, using job data if available
  const sourceEntries = sources.map((source) => {
    const job = jobs[source];
    // A job only exists if it has a jobId (meaning a fetch was actually started)
    const hasJob = !!(job && job.jobId);
    return [source, job || { status: 'pending' as const }, hasJob] as [
      string,
      JobStatus | { status: 'pending' },
      boolean,
    ];
  });

  return (
    <div className="space-y-2">
      {sourceEntries.map(([source, job, hasJob]) => (
        <JobStatusRow
          key={source}
          source={source}
          job={job}
          hasJob={hasJob}
          searchRequest={searchRequest}
          searching={searching}
          onFetch={handleFetch}
        />
      ))}
    </div>
  );
}
