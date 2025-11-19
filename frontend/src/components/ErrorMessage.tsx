import { Card, CardContent } from './ui/card';

interface ErrorMessageProps {
  title?: string;
  message?: string | null;
  showConsoleHint?: boolean;
}

export function ErrorMessage({
  title = 'An error occurred',
  message,
  showConsoleHint = true,
}: ErrorMessageProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-2">
          <div className="text-destructive font-semibold">{title}</div>
          {message && (
            <div className="text-sm text-muted-foreground">{message}</div>
          )}
          {showConsoleHint && (
            <div className="text-sm text-muted-foreground">
              Please check the browser console for more details.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

