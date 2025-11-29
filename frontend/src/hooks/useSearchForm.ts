import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { buildSearchParams } from '../utils/searchParams';

interface UseSearchFormReturn {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  isRoundTrip: boolean;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  setDepartureDate: (value: string) => void;
  setReturnDate: (value: string) => void;
  setIsRoundTrip: (value: boolean) => void;
}

/**
 * Custom hook that manages search form state and syncs with URL params
 */
export function useSearchForm(): UseSearchFormReturn {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/' });

  const [origin, setOriginState] = useState(searchParams.origin || '');
  const [destination, setDestinationState] = useState(searchParams.destination || '');
  const [departureDate, setDepartureDateState] = useState(searchParams.departureDate || '');
  const [returnDate, setReturnDateState] = useState(searchParams.returnDate || '');
  const [isRoundTrip, setIsRoundTripState] = useState(searchParams.roundTrip || false);

  // Sync form fields with URL params when they change externally
  useEffect(() => {
    setOriginState(searchParams.origin || '');
    setDestinationState(searchParams.destination || '');
    setDepartureDateState(searchParams.departureDate || '');
    setIsRoundTripState(searchParams.roundTrip || false);
    // Only set returnDate if roundTrip is checked
    if (searchParams.roundTrip) {
      setReturnDateState(searchParams.returnDate || '');
    } else {
      setReturnDateState(''); // Clear returnDate when roundTrip is unchecked
    }
  }, [
    searchParams.origin,
    searchParams.destination,
    searchParams.departureDate,
    searchParams.returnDate,
    searchParams.roundTrip,
  ]);

  // Update URL params when form fields change
  const updateUrlParams = (
    updates: Partial<{
      origin: string;
      destination: string;
      departureDate: string;
      returnDate?: string;
      roundTrip?: boolean;
    }>
  ) => {
    const updatedRoundTrip = updates.roundTrip !== undefined ? updates.roundTrip : isRoundTrip;
    const newParams = buildSearchParams({
      origin: updates.origin ?? origin,
      destination: updates.destination ?? destination,
      departureDate: updates.departureDate ?? departureDate,
      returnDate: updates.returnDate !== undefined ? updates.returnDate : returnDate,
      roundTrip: updatedRoundTrip,
    });

    navigate({
      search: newParams as any,
      replace: true,
    });
  };

  const setOrigin = (value: string) => {
    const upperValue = value.toUpperCase();
    setOriginState(upperValue);
    updateUrlParams({ origin: upperValue || '' });
  };

  const setDestination = (value: string) => {
    const upperValue = value.toUpperCase();
    setDestinationState(upperValue);
    updateUrlParams({ destination: upperValue || '' });
  };

  const setDepartureDate = (value: string) => {
    setDepartureDateState(value);
    updateUrlParams({ departureDate: value });
  };

  const setReturnDate = (value: string) => {
    setReturnDateState(value);
    updateUrlParams({ returnDate: value || undefined });
  };

  const setIsRoundTrip = (checked: boolean) => {
    setIsRoundTripState(checked);
    if (!checked) {
      setReturnDateState('');
      updateUrlParams({ roundTrip: false, returnDate: undefined });
    } else {
      updateUrlParams({ roundTrip: true, returnDate: returnDate || undefined });
    }
  };

  return {
    origin,
    destination,
    departureDate,
    returnDate,
    isRoundTrip,
    setOrigin,
    setDestination,
    setDepartureDate,
    setReturnDate,
    setIsRoundTrip,
  };
}

