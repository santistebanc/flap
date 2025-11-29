import { JobStatus } from '../../hooks/useSearchState';
import { SearchRequest } from '../../types';
import { FetchButton } from './FetchButton';
import { formatDateTime } from '../../utils/format';
import { isValidRequest } from '../../utils/jobStatus';

interface JobActionButtonsProps {
  job: JobStatus | { status: 'pending' };
  hasJob: boolean;
  source: string;
  searchRequest?: SearchRequest;
  searching: string | null;
  onFetch: (source: string) => void;
}

/**
 * Renders the appropriate action buttons based on job status
 */
export function JobActionButtons({
  job,
  hasJob,
  source,
  searchRequest,
  searching,
  onFetch,
}: JobActionButtonsProps) {
  const isSearching = searching === source;
  const canFetch = isValidRequest(searchRequest);

  // Show last fetched time if available
  const lastFetchedAt = 'lastFetchedAt' in job ? job.lastFetchedAt : undefined;
  const lastFetchedTime = lastFetchedAt ? formatDateTime(lastFetchedAt) : null;

  if (job.status === 'active' || (job.status === 'pending' && hasJob)) {
    // Job is active or pending - show status only
    return (
      <>
        {lastFetchedTime && (
          <span className="text-muted-foreground text-[10px] whitespace-nowrap">{lastFetchedTime}</span>
        )}
        <FetchButton
          onClick={() => onFetch(source)}
          disabled={!canFetch || isSearching}
          isLoading={isSearching}
          title="Start new fetch"
        />
      </>
    );
  }

  if (job.status === 'failed') {
    return (
      <>
        {lastFetchedTime && (
          <span className="text-muted-foreground text-[10px] whitespace-nowrap">{lastFetchedTime}</span>
        )}
        <FetchButton
          onClick={() => onFetch(source)}
          disabled={!canFetch || isSearching}
          isLoading={isSearching}
          title="Start new fetch"
        />
      </>
    );
  }

  if (job.status === 'completed') {
    return (
      <>
        {lastFetchedTime && (
          <span className="text-muted-foreground text-[10px] whitespace-nowrap">{lastFetchedTime}</span>
        )}
        <FetchButton
          onClick={() => onFetch(source)}
          disabled={!canFetch || isSearching}
          isLoading={isSearching}
          title="Start new fetch"
        />
      </>
    );
  }

  // No job yet - show start fetch button
  return (
    <>
      {lastFetchedTime && (
        <span className="text-muted-foreground text-[10px] whitespace-nowrap">{lastFetchedTime}</span>
      )}
      <FetchButton
        onClick={() => onFetch(source)}
        disabled={!canFetch || isSearching}
        isLoading={isSearching}
        title="Start fetch"
      />
    </>
  );
}

