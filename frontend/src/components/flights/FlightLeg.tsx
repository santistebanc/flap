import { SearchResultLeg } from '../../types';
import { formatDuration } from '../../utils/format';
import { FlightSegment } from './FlightSegment';

interface FlightLegProps {
  legs: SearchResultLeg[];
  title: string;
}

/**
 * Displays a flight leg (outbound or inbound) with all segments
 */
export function FlightLeg({ legs, title }: FlightLegProps) {
  if (legs.length === 0) {
    return null;
  }

  // Calculate total duration from all legs + connection times
  const totalDuration = legs.reduce((sum, leg, index) => {
    const legDuration = parseInt(leg.duration, 10);
    // Add connection time if it exists (not on the last leg)
    const connectionTime = index < legs.length - 1 && leg.connectionTime 
      ? parseInt(leg.connectionTime, 10) 
      : 0;
    return sum + legDuration + connectionTime;
  }, 0);
  const stops = Math.max(0, legs.length - 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground uppercase">{title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>Total: {formatDuration(totalDuration)}</span>
          {stops > 0 && (
            <>
              <span>•</span>
              <span>
                {stops} stop{stops !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      </div>
      {legs.map((leg, index) => (
        <FlightSegment 
          key={leg.legId} 
          leg={leg} 
          connectionTime={leg.connectionTime ? parseInt(leg.connectionTime, 10) : null} 
          isLast={index === legs.length - 1} 
        />
      ))}
    </div>
  );
}

