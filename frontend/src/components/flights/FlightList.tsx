import { Flight } from '../../types';
import { FlightItem } from './FlightItem';

interface FlightListProps {
  flights: Flight[];
  title?: string;
  showConnectionTime?: boolean;
}

export function FlightList({
  flights,
  title,
  showConnectionTime = true,
}: FlightListProps) {
  if (flights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {title && <div className="text-sm font-medium mb-2">{title}</div>}
      {flights.map((flight) => (
        <FlightItem
          key={flight.id}
          flight={flight}
          showConnectionTime={showConnectionTime}
        />
      ))}
    </div>
  );
}

