import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Clock, Plane } from 'lucide-react';
import { Deal, Flight } from '../../types';
import { formatDuration, formatPrice, formatTime } from '../../utils/format';

interface TripEntryProps {
  tripId: string;
  deals: Deal[];
  flights: Flight[];
}

export function TripEntry({ tripId, deals, flights }: TripEntryProps) {
  const [isDealsOpen, setIsDealsOpen] = useState(false);

  if (deals.length === 0) {
    return null;
  }

  // Sort deals by price
  const sortedDeals = [...deals].sort((a, b) => a.price - b.price);
  const lowestDeal = sortedDeals[0];

  // Separate outbound and inbound flights
  const outboundFlights = flights
    .filter((f) => !f.leg?.inbound)
    .sort((a, b) => (a.leg?.order || 0) - (b.leg?.order || 0));
  const inboundFlights = flights
    .filter((f) => f.leg?.inbound)
    .sort((a, b) => (a.leg?.order || 0) - (b.leg?.order || 0));

  // Format route compactly with times
  const formatRoute = (flightList: Flight[]) => {
    if (flightList.length === 0) return '';
    const segments: string[] = [];
    flightList.forEach((f, idx) => {
      if (idx === 0) {
        segments.push(`${f.origin} ${formatTime(f.departure_time)}`);
      }
      segments.push(`${f.destination} ${formatTime(f.arrival_time)}`);
    });
    return segments.join(' → ');
  };

  // Format route without times for compact display
  const formatRouteCompact = (flightList: Flight[]) => {
    if (flightList.length === 0) return '';
    const airports = [flightList[0].origin];
    flightList.forEach((f) => airports.push(f.destination));
    return airports.join(' → ');
  };

  const outboundRoute = formatRouteCompact(outboundFlights);
  const inboundRoute = inboundFlights.length > 0 ? formatRouteCompact(inboundFlights) : null;
  
  // Get first departure and last arrival times for compact display
  const firstDeparture = outboundFlights[0]?.departure_time;
  const lastArrival = outboundFlights.length > 0 
    ? outboundFlights[outboundFlights.length - 1]?.arrival_time
    : inboundFlights.length > 0 
      ? inboundFlights[inboundFlights.length - 1]?.arrival_time 
      : null;

  // Calculate total duration for outbound and inbound separately
  const outboundDuration = outboundFlights.reduce((sum, f) => sum + f.duration, 0);
  const inboundDuration = inboundFlights.reduce((sum, f) => sum + f.duration, 0);

  // Calculate stops for outbound and inbound separately
  const outboundStops = Math.max(0, outboundFlights.length - 1);
  const inboundStops = Math.max(0, inboundFlights.length - 1);

  // Format flight details for display
  const formatFlightDetails = (flightList: Flight[]) => {
    return flightList.map((flight, idx) => {
      const connectionTime = idx < flightList.length - 1 
        ? flightList[idx].leg?.connection_time 
        : null;
      
      return {
        flight,
        connectionTime,
        isLast: idx === flightList.length - 1,
      };
    });
  };

  const outboundDetails = formatFlightDetails(outboundFlights);
  const inboundDetails = formatFlightDetails(inboundFlights);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header with price */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">
                  {deals.length > 1 && `${deals.length} deals available`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsDealsOpen(true)}
                  className="text-2xl font-bold hover:text-primary transition-colors cursor-pointer"
                >
                  {formatPrice(lowestDeal.price)}
                </button>
              </div>
            </div>

            {/* Outbound flights */}
            {outboundDetails.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Outbound</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Total: {formatDuration(outboundDuration)}</span>
                    {outboundStops > 0 && (
                      <>
                        <span>•</span>
                        <span>{outboundStops} stop{outboundStops !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>
                </div>
                {outboundDetails.map(({ flight, connectionTime, isLast }, idx) => (
                  <div key={flight.id} className="space-y-1 pl-2 border-l-2 border-primary/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Plane className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{flight.flight_number}</span>
                      <span className="text-muted-foreground text-xs">{flight.airline}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs">{formatDuration(flight.duration)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground pl-5">
                      <span className="font-medium">{flight.origin}</span> {formatTime(flight.departure_time)} → 
                      <span className="font-medium"> {flight.destination}</span> {formatTime(flight.arrival_time)}
                    </div>
                    {connectionTime !== null && !isLast && (
                      <div className="text-xs text-muted-foreground pl-5 italic">
                        {formatDuration(connectionTime)} layover in {flight.destination}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Inbound flights */}
            {inboundDetails.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Return</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Total: {formatDuration(inboundDuration)}</span>
                    {inboundStops > 0 && (
                      <>
                        <span>•</span>
                        <span>{inboundStops} stop{inboundStops !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>
                </div>
                {inboundDetails.map(({ flight, connectionTime, isLast }, idx) => (
                  <div key={flight.id} className="space-y-1 pl-2 border-l-2 border-primary/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Plane className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{flight.flight_number}</span>
                      <span className="text-muted-foreground text-xs">{flight.airline}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs">{formatDuration(flight.duration)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground pl-5">
                      <span className="font-medium">{flight.origin}</span> {formatTime(flight.departure_time)} → 
                      <span className="font-medium"> {flight.destination}</span> {formatTime(flight.arrival_time)}
                    </div>
                    {connectionTime !== null && !isLast && (
                      <div className="text-xs text-muted-foreground pl-5 italic">
                        {formatDuration(connectionTime)} layover in {flight.destination}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        </CardContent>
      </Card>

      <Dialog open={isDealsOpen} onOpenChange={setIsDealsOpen}>
        <DialogContent onClose={() => setIsDealsOpen(false)}>
          <DialogHeader>
            <DialogTitle>Available Deals</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {sortedDeals.map((deal) => {
              // All deals share the same flights for this trip
              const dealOutboundDetails = formatFlightDetails(outboundFlights);
              const dealInboundDetails = formatFlightDetails(inboundFlights);

              return (
                <Card key={deal.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{deal.provider}</div>
                          <div className="text-sm text-muted-foreground">via {deal.source}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{formatPrice(deal.price)}</div>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            <a href={deal.link} target="_blank" rel="noopener noreferrer">
                              Book
                            </a>
                          </Button>
                        </div>
                      </div>

                      {/* Outbound flights */}
                      {dealOutboundDetails.length > 0 && (
                        <div className="space-y-2 pt-2 border-t">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">Outbound</div>
                          {dealOutboundDetails.map(({ flight, connectionTime, isLast }, idx) => (
                            <div key={flight.id} className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Plane className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{flight.flight_number}</span>
                                <span className="text-muted-foreground text-xs">{flight.airline}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-xs">{formatDuration(flight.duration)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground pl-5">
                                {flight.origin} {formatTime(flight.departure_time)} → {flight.destination} {formatTime(flight.arrival_time)}
                              </div>
                              {connectionTime !== null && !isLast && (
                                <div className="text-xs text-muted-foreground pl-5 italic">
                                  {formatDuration(connectionTime)} layover in {flight.destination}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inbound flights */}
                      {dealInboundDetails.length > 0 && (
                        <div className="space-y-2 pt-2 border-t">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">Return</div>
                          {dealInboundDetails.map(({ flight, connectionTime, isLast }, idx) => (
                            <div key={flight.id} className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Plane className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{flight.flight_number}</span>
                                <span className="text-muted-foreground text-xs">{flight.airline}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-xs">{formatDuration(flight.duration)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground pl-5">
                                {flight.origin} {formatTime(flight.departure_time)} → {flight.destination} {formatTime(flight.arrival_time)}
                              </div>
                              {connectionTime !== null && !isLast && (
                                <div className="text-xs text-muted-foreground pl-5 italic">
                                  {formatDuration(connectionTime)} layover in {flight.destination}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
                        <span>Total: {formatDuration(deal.duration)}</span>
                        {deal.stop_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{deal.stop_count} stop{deal.stop_count !== 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
