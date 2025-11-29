import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { SearchResult } from '../../types';
import { TripEntryHeader } from './TripEntryHeader';
import { FlightLeg } from './FlightLeg';
import { DealsDialog } from './DealsDialog';

interface TripEntryProps {
  result: SearchResult;
}

/**
 * Main component that displays a trip entry with deals and flights
 */
export function TripEntry({ result }: TripEntryProps) {
  const [isDealsOpen, setIsDealsOpen] = useState(false);

  if (result.deals.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-3">
            <TripEntryHeader deals={result.deals} onDealsClick={() => setIsDealsOpen(true)} />

            {result.outboundLegs.length > 0 && <FlightLeg legs={result.outboundLegs} title="Outbound" />}

            {result.inboundLegs.length > 0 && (
              <div className="pt-2 border-t">
                <FlightLeg legs={result.inboundLegs} title="Return" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DealsDialog isOpen={isDealsOpen} onClose={() => setIsDealsOpen(false)} deals={result.deals} />
    </>
  );
}
