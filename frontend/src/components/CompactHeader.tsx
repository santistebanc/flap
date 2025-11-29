import { Loader2 } from 'lucide-react';
import { SearchRequest } from '../types';
import { JobStatusIndicator } from './flights/JobStatusIndicator';
import { JobStatus } from '../hooks/useSearchState';
import { useSearchForm } from '../hooks/useSearchForm';
import { SearchFormFields } from './SearchFormFields';
import { ClearDataButton } from './ClearDataButton';

interface CompactHeaderProps {
  isLoading?: boolean;
  jobs?: { [source: string]: JobStatus };
  searchRequest?: SearchRequest;
  onJobUpdate?: (updatedJobs?: { [source: string]: JobStatus }) => void;
  onResultsRefresh?: () => void;
}

/**
 * Compact header component with search form and job status indicators
 */
export function CompactHeader({
  isLoading,
  jobs = {},
  searchRequest,
  onJobUpdate,
  onResultsRefresh,
}: CompactHeaderProps) {
  const {
    origin,
    destination,
    departureDate,
    returnDate,
    isRoundTrip,
    setOrigin,
    setDestination,
    setDepartureDate,
    setReturnDate,
    setIsRoundTrip,
  } = useSearchForm();

  // Always pass current form state for validation, even if incomplete
  const currentRequest: SearchRequest | undefined =
    searchRequest ||
    ({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate,
      returnDate: isRoundTrip ? returnDate : undefined,
    } as SearchRequest);

  return (
    <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 py-2">
        <form className="flex items-center gap-2 flex-wrap">
          <SearchFormFields
            origin={origin}
            destination={destination}
            departureDate={departureDate}
            returnDate={returnDate}
            isRoundTrip={isRoundTrip}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onDepartureDateChange={setDepartureDate}
            onReturnDateChange={setReturnDate}
            onRoundTripChange={setIsRoundTrip}
            disabled={isLoading}
          />

          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

          <ClearDataButton />
        </form>

        {/* Progress section - always visible */}
        <div className="mt-3 pt-3 border-t">
          <JobStatusIndicator
            jobs={jobs}
            searchRequest={currentRequest}
            onJobUpdate={onJobUpdate}
            onResultsRefresh={onResultsRefresh}
          />
        </div>
      </div>
    </div>
  );
}
