import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Clock } from 'lucide-react';
import { SearchResult } from '../../types';
import { formatPrice } from '../../utils/format';

interface DealsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deals: SearchResult['deals'];
}

/**
 * Formats relative datetime for display
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const weeks = Math.round(days / 7);
  const months = Math.round(days / 30);
  const years = Math.round(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (weeks < 4) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Dialog component that displays all available deals for a trip
 */
export function DealsDialog({ isOpen, onClose, deals }: DealsDialogProps) {
  // Sort deals by price
  const sortedDeals = [...deals].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Available Deals</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {sortedDeals.map((deal) => (
            <Card key={deal.dealId}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold">{deal.provider}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Updated {formatRelativeTime(deal.last_update)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{formatPrice(parseFloat(deal.price))}</div>
                    {deal.link && (
                      <Button asChild variant="outline" size="sm" className="mt-2">
                        <a href={deal.link} target="_blank" rel="noopener noreferrer">
                          Book
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

