import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Trash2, Loader2 } from 'lucide-react';
import { SearchRequest } from '../types';
import { clearAllData } from '../services/api';
import { JobStatusIndicator } from './flights/JobStatusIndicator';
import { JobStatus } from '../hooks/useSearchState';

interface CompactHeaderProps {
  onSubmit?: (request: SearchRequest) => void; // Optional now since main fetch button is removed
  isLoading?: boolean;
  jobs?: { [source: string]: JobStatus };
  searchRequest?: SearchRequest;
  onJobUpdate?: (updatedJobs?: { [source: string]: JobStatus }) => void;
  onResultsRefresh?: () => void;
}

export function CompactHeader({ onSubmit, isLoading, jobs = {}, searchRequest, onJobUpdate, onResultsRefresh }: CompactHeaderProps) {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/' });
  
  const [origin, setOrigin] = useState(searchParams.origin || '');
  const [destination, setDestination] = useState(searchParams.destination || '');
  const [departureDate, setDepartureDate] = useState(searchParams.departureDate || '');
  const [returnDate, setReturnDate] = useState(searchParams.returnDate || '');
  const [isRoundTrip, setIsRoundTrip] = useState(!!searchParams.returnDate);
  const [isClearing, setIsClearing] = useState(false);

  // Sync form fields with URL params when they change externally
  useEffect(() => {
    setOrigin(searchParams.origin || '');
    setDestination(searchParams.destination || '');
    setDepartureDate(searchParams.departureDate || '');
    setReturnDate(searchParams.returnDate || '');
    setIsRoundTrip(!!searchParams.returnDate);
  }, [searchParams.origin, searchParams.destination, searchParams.departureDate, searchParams.returnDate]);

  // Update URL params when form fields change
  const updateUrlParams = (updates: Partial<{ origin: string; destination: string; departureDate: string; returnDate?: string }>) => {
    const newParams = {
      origin: updates.origin ?? origin,
      destination: updates.destination ?? destination,
      departureDate: updates.departureDate ?? departureDate,
      returnDate: updates.returnDate !== undefined ? updates.returnDate : (isRoundTrip ? returnDate : undefined),
    };
    
    // Remove empty values
    Object.keys(newParams).forEach(key => {
      if (!newParams[key as keyof typeof newParams]) {
        delete newParams[key as keyof typeof newParams];
      }
    });
    
    navigate({
      search: newParams,
      replace: true,
    });
  };

  // Always pass current form state for validation, even if incomplete
  const currentRequest: SearchRequest | undefined = searchRequest || {
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
    departureDate,
    returnDate: isRoundTrip ? returnDate : undefined,
  };


  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all flight data? This action cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      const result = await clearAllData();
      alert(`Successfully cleared ${result.deleted} items from the database.`);
      window.location.reload();
    } catch (error) {
      alert(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClearing(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 py-2">
        <form className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="origin" className="sr-only">Origin</Label>
            <Input
              id="origin"
              value={origin}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setOrigin(value);
                updateUrlParams({ origin: value || '' });
              }}
              placeholder="From"
              maxLength={3}
              required
              disabled={isLoading}
              className="w-20"
            />
            <Label htmlFor="destination" className="sr-only">Destination</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setDestination(value);
                updateUrlParams({ destination: value || '' });
              }}
              placeholder="To"
              maxLength={3}
              required
              disabled={isLoading}
              className="w-20"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="departureDate" className="sr-only">Departure Date</Label>
            <Input
              id="departureDate"
              type="date"
              value={departureDate}
              onChange={(e) => {
                const value = e.target.value;
                setDepartureDate(value);
                updateUrlParams({ departureDate: value });
              }}
              min={today}
              required
              disabled={isLoading}
              className="w-36"
            />
            {isRoundTrip && (
              <>
                <Label htmlFor="returnDate" className="sr-only">Return Date</Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={returnDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setReturnDate(value);
                    updateUrlParams({ returnDate: value || undefined });
                  }}
                  min={departureDate || today}
                  disabled={isLoading}
                  className="w-36"
                />
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="roundTrip"
              checked={isRoundTrip}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsRoundTrip(checked);
                if (!checked) {
                  setReturnDate('');
                  updateUrlParams({ returnDate: undefined });
                } else if (departureDate && returnDate) {
                  updateUrlParams({ returnDate });
                }
              }}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="roundTrip" className="text-sm cursor-pointer whitespace-nowrap">
              Round Trip
            </Label>
          </div>

          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isClearing}
            className="text-destructive hover:text-destructive ml-auto"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear Data
          </Button>
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

