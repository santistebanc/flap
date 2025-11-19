import { SearchResult } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { Card, CardContent } from '../ui/card';
import { TripEntry } from './TripEntry';

interface FlightResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
}

export function FlightResults({ results, isLoading }: FlightResultsProps) {
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner message="Loading results..." />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">No results found</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="space-y-2">
        {results.map((result) => (
          <TripEntry
            key={result.tripId}
            tripId={result.tripId}
            deals={result.deals}
            flights={result.flights}
          />
        ))}
      </div>
    </div>
  );
}

