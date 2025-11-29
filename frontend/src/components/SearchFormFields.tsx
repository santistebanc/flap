import { Input } from './ui/input';
import { Label } from './ui/label';

interface SearchFormFieldsProps {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  isRoundTrip: boolean;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onDepartureDateChange: (value: string) => void;
  onReturnDateChange: (value: string) => void;
  onRoundTripChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Form fields component for search inputs (origin, destination, dates, round trip)
 */
export function SearchFormFields({
  origin,
  destination,
  departureDate,
  returnDate,
  isRoundTrip,
  onOriginChange,
  onDestinationChange,
  onDepartureDateChange,
  onReturnDateChange,
  onRoundTripChange,
  disabled = false,
}: SearchFormFieldsProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <div className="flex items-center gap-2">
        <Label htmlFor="origin" className="sr-only">
          Origin
        </Label>
        <Input
          id="origin"
          value={origin}
          onChange={(e) => onOriginChange(e.target.value)}
          placeholder="From"
          maxLength={3}
          required
          disabled={disabled}
          className="w-20"
        />
        <Label htmlFor="destination" className="sr-only">
          Destination
        </Label>
        <Input
          id="destination"
          value={destination}
          onChange={(e) => onDestinationChange(e.target.value)}
          placeholder="To"
          maxLength={3}
          required
          disabled={disabled}
          className="w-20"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="departureDate" className="sr-only">
          Departure Date
        </Label>
        <Input
          id="departureDate"
          type="date"
          value={departureDate}
          onChange={(e) => onDepartureDateChange(e.target.value)}
          min={today}
          required
          disabled={disabled}
          className="w-36"
        />
        {isRoundTrip && (
          <>
            <Label htmlFor="returnDate" className="sr-only">
              Return Date
            </Label>
            <Input
              id="returnDate"
              type="date"
              value={returnDate}
              onChange={(e) => onReturnDateChange(e.target.value)}
              min={departureDate || today}
              disabled={disabled}
              className="w-36"
            />
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="roundTrip"
          checked={isRoundTrip}
          onChange={(e) => onRoundTripChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="roundTrip" className="text-sm cursor-pointer whitespace-nowrap">
          Round Trip
        </Label>
      </div>
    </>
  );
}

