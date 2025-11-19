import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Trash2 } from 'lucide-react';
import { SearchRequest } from '../types';
import { clearAllData } from '../services/api';

interface CompactHeaderProps {
  onSubmit: (request: SearchRequest) => void;
  isLoading?: boolean;
}

export function CompactHeader({ onSubmit, isLoading }: CompactHeaderProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!origin || !destination || !departureDate) {
      return;
    }

    onSubmit({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate,
      returnDate: isRoundTrip ? returnDate : undefined,
    });
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
      <div className="container mx-auto px-4 py-2">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="origin" className="sr-only">Origin</Label>
            <Input
              id="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
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
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
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
              onChange={(e) => setDepartureDate(e.target.value)}
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
                  onChange={(e) => setReturnDate(e.target.value)}
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
              onChange={(e) => setIsRoundTrip(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="roundTrip" className="text-sm cursor-pointer whitespace-nowrap">
              Round Trip
            </Label>
          </div>

          <Button type="submit" disabled={isLoading} size="sm">
            {isLoading ? 'Searching...' : 'Search'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isClearing}
            className="text-destructive hover:text-destructive ml-auto"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </form>
      </div>
    </div>
  );
}

