import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Clock } from 'lucide-react';
import { Deal, Flight } from '../../types';
import { formatDuration, formatPrice } from '../../utils/format';
import { FlightList } from './FlightList';

interface DealCardProps {
  deal: Deal;
  flights: Flight[];
}

export function DealCard({ deal, flights }: DealCardProps) {
  const outboundFlights = flights.filter((f) => !f.leg?.inbound);
  const returnFlights = flights.filter((f) => f.leg?.inbound);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {deal.origin} → {deal.destination}
              {deal.is_round && ' (Round Trip)'}
            </CardTitle>
            <CardDescription>
              {deal.provider} via {deal.source}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatPrice(deal.price)}</div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <a href={deal.link} target="_blank" rel="noopener noreferrer">
                Book Now
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Duration: {formatDuration(deal.duration)}</span>
            <span className="mx-2">•</span>
            <span>Stops: {deal.stop_count}</span>
          </div>

          <FlightList flights={outboundFlights} />

          {deal.is_round && returnFlights.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <FlightList flights={returnFlights} title="Return Flight" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

