import { useState } from 'react';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';
import { clearAllData } from '../services/api';

/**
 * Button component that clears all flight data from the database
 */
export function ClearDataButton() {
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all flight data? This action cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      const result = await clearAllData();
      alert(`Successfully cleared ${result.deleted} items from the database.`);
      window.location.reload();
    } catch (error) {
      alert(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClear}
      disabled={isClearing}
      className="text-destructive hover:text-destructive ml-auto"
    >
      <Trash2 className="h-4 w-4 mr-1" />
      Clear Data
    </Button>
  );
}

