import { JobStatusIcon } from './JobStatusIcon';
import { getStatusText, getStatusColor } from '../../utils/jobStatus';

interface JobStatusBadgeProps {
  status: string;
  hasJob: boolean;
}

/**
 * Displays the status icon and text together
 */
export function JobStatusBadge({ status, hasJob }: JobStatusBadgeProps) {
  return (
    <>
      <JobStatusIcon status={status} hasJob={hasJob} />
      <span className={getStatusColor(status)}>{getStatusText(status, hasJob)}</span>
    </>
  );
}

