import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

interface JobStatusIconProps {
  status: string;
  hasJob: boolean;
}

/**
 * Displays the icon for a job status
 */
export function JobStatusIcon({ status, hasJob }: JobStatusIconProps) {
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
}

