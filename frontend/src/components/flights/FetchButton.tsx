import { Button } from '../ui/button';
import { Loader2, Search } from 'lucide-react';

interface FetchButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  title?: string;
}

/**
 * Button for starting a new fetch
 */
export function FetchButton({ onClick, disabled, isLoading, title = 'Start fetch' }: FetchButtonProps) {
  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-7 px-2.5 text-xs"
      title={title}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <Search className="h-3.5 w-3.5 mr-1" />
          Fetch
        </>
      )}
    </Button>
  );
}

