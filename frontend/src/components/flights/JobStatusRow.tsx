import { JobStatus } from '../../hooks/useSearchState';
import { SearchRequest } from '../../types';
import { capitalizeSource } from '../../utils/jobStatus';
import { JobStatusBadge } from './JobStatusBadge';
import { JobActionButtons } from './JobActionButtons';

interface JobStatusRowProps {
  source: string;
  job: JobStatus | { status: 'pending' };
  hasJob: boolean;
  searchRequest?: SearchRequest;
  searching: string | null;
  onFetch: (source: string) => void;
}

/**
 * Renders a single row for a job source status
 */
export function JobStatusRow({
  source,
  job,
  hasJob,
  searchRequest,
  searching,
  onFetch,
}: JobStatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/50 text-xs">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <JobStatusBadge status={job.status} hasJob={hasJob} />
        <span className="font-medium whitespace-nowrap">{capitalizeSource(source)}</span>
        {'resultCount' in job && job.resultCount !== undefined && (
          <span className="text-muted-foreground">
            • {job.resultCount} {job.resultCount === 1 ? 'result' : 'results'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <JobActionButtons
          job={job}
          hasJob={hasJob}
          source={source}
          searchRequest={searchRequest}
          searching={searching}
          onFetch={onFetch}
        />
      </div>
    </div>
  );
}

