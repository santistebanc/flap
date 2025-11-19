import { useState } from 'react';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';
import { clearAllData } from '../services/api';

interface HeaderProps {
  title?: string;
  description?: string;
}

export function Header({
  title = 'Flight Search',
  description = 'Search for flights across multiple providers',
}: HeaderProps) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all flight data? This action cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      const result = await clearAllData();
      alert(`Successfully cleared ${result.deleted} items from the database.`);
      // Reload the page to reset the UI
      window.location.reload();
    } catch (error) {
      alert(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="text-center space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex-1"></div>
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex-1 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isClearing}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing ? 'Clearing...' : 'Clear All'}
          </Button>
        </div>
      </div>
    </div>
  );
}
