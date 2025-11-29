import { useState, useEffect } from 'react';
import { SearchResult } from '../../types';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { TripEntry } from './TripEntry';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FlightResultsProps {
  results: SearchResult[];
}

const RESULTS_PER_PAGE = 10;

export function FlightResults({ results }: FlightResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when results change
  useEffect(() => {
    setCurrentPage(1);
  }, [results.length]);

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

  // Sort results by lowest price (lowest to highest)
  const sortedResults = [...results].sort((a, b) => {
    const aLowestPrice = a.deals.length > 0 
      ? Math.min(...a.deals.map(deal => parseFloat(deal.price)))
      : Infinity;
    const bLowestPrice = b.deals.length > 0
      ? Math.min(...b.deals.map(deal => parseFloat(deal.price)))
      : Infinity;
    return aLowestPrice - bLowestPrice;
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedResults.length / RESULTS_PER_PAGE);
  const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
  const endIndex = startIndex + RESULTS_PER_PAGE;
  const paginatedResults = sortedResults.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // Pagination controls component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first page, last page, current page, and pages around current
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="min-w-[2.5rem]"
                >
                  {page}
                </Button>
              );
            } else if (
              page === currentPage - 2 ||
              page === currentPage + 2
            ) {
              return (
                <span key={page} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }
            return null;
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="space-y-4">
        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, sortedResults.length)} of {sortedResults.length} results
        </div>

        {/* Pagination controls - Top */}
        <PaginationControls />

        {/* Results list */}
        <div className="space-y-2">
          {paginatedResults.map((result) => (
            <TripEntry
              key={result.tripId}
              result={result}
            />
          ))}
        </div>

        {/* Pagination controls - Bottom */}
        <PaginationControls />
      </div>
    </div>
  );
}

