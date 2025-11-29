import { SearchResult } from '../../types';
import { formatPrice } from '../../utils/format';

interface TripEntryHeaderProps {
  deals: SearchResult['deals'];
  onDealsClick: () => void;
}

/**
 * Header component for trip entry showing price and deal count
 */
export function TripEntryHeader({ deals, onDealsClick }: TripEntryHeaderProps) {
  if (deals.length === 0) {
    return null;
  }

  // Sort deals by price to get lowest
  const sortedDeals = [...deals].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  const lowestDeal = sortedDeals[0];

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1">
          {deals.length > 1 && `${deals.length} deals available`}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onDealsClick}
          className="text-2xl font-bold hover:text-primary transition-colors cursor-pointer"
        >
          {formatPrice(parseFloat(lowestDeal.price))}
        </button>
      </div>
    </div>
  );
}

