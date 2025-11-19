import { Plane, MapPin } from 'lucide-react';
import { Flight } from '../../types';
import { formatTime, formatDuration } from '../../utils/format';

interface FlightItemProps {
  flight: Flight;
  showConnectionTime?: boolean;
}

export function FlightItem({ flight, showConnectionTime = true }: FlightItemProps) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Plane className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{flight.flight_number}</span>
        <span className="text-muted-foreground">{flight.airline}</span>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span>
          {flight.origin} {formatTime(flight.departure_time)}
        </span>
        <span>→</span>
        <span>
          {flight.destination} {formatTime(flight.arrival_time)}
        </span>
      </div>
      {showConnectionTime && flight.leg?.connection_time && (
        <span className="text-muted-foreground">
          ({formatDuration(flight.leg.connection_time)} layover)
        </span>
      )}
    </div>
  );
}

