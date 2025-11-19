import { FlightResults } from './components/flights';
import { CompactHeader } from './components/CompactHeader';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { useSearch } from './hooks/useSearch';

function App() {
  const { results, status, errorMessage, isSearching, handleSearch } = useSearch();

  return (
    <div className="min-h-screen bg-background">
      <CompactHeader onSubmit={handleSearch} isLoading={isSearching} />

      {status === 'processing' && (
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Searching for flights... This may take a few moments." />
        </div>
      )}

      {status === 'completed' && results.length === 0 && (
        <div className="container mx-auto px-4 py-8">
          <ErrorMessage
            title="No flights found"
            message="We couldn't find any flights matching your search criteria. Please try different dates or destinations."
          />
        </div>
      )}

      {results.length > 0 && (
        <FlightResults results={results} isLoading={isSearching} />
      )}

      {status === 'error' && (
        <div className="container mx-auto px-4 py-8">
          <ErrorMessage
            title="An error occurred while searching"
            message={errorMessage || 'An unknown error occurred'}
          />
        </div>
      )}
    </div>
  );
}

export default App;

