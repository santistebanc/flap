import { Plane } from 'lucide-react';
import { SearchResultLeg } from '../../types';
import { formatDuration, formatTime } from '../../utils/format';

interface FlightSegmentProps {
  leg: SearchResultLeg;
  connectionTime: number | null | undefined;
  isLast: boolean;
}

/**
 * Displays a single flight segment with connection time if applicable
 */
export function FlightSegment({ leg, connectionTime, isLast }: FlightSegmentProps) {
  return (
    <div className="space-y-1 pl-2 border-l-2 border-primary/20">
      <div className="flex items-center gap-2 text-sm">
        <Plane className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="font-medium">{leg.flightNumber}</span>
        <span className="text-muted-foreground text-xs">{leg.airline.name}</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-xs">{formatDuration(parseInt(leg.duration, 10))}</span>
      </div>
      <div className="text-xs text-muted-foreground pl-5">
        <span className="font-medium">{leg.origin.code}</span> {formatTime(leg.departure.time)} →{' '}
        <span className="font-medium"> {leg.destination.code}</span> {formatTime(leg.arrival.time)}
      </div>
      {connectionTime !== null && connectionTime !== undefined && !isLast && (
        <div className="text-xs text-muted-foreground pl-5 italic">
          {formatDuration(connectionTime)} layover in {leg.destination.code}
        </div>
      )}
    </div>
  );
}

