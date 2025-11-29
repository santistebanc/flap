/**
 * Convert YYYY-MM-DD to DD/MM/YYYY format (for Kiwi scraper)
 */
import { format, parse } from 'date-fns';
import { Result, ok, err } from 'neverthrow';

export function convertDateToKiwiFormat(dateStr: string): string {
  const result = convertDateToKiwiFormatSafe(dateStr);
  return result.isOk() ? result.value : dateStr;
}

export function convertDateToKiwiFormatSafe(dateStr: string): Result<string, Error> {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return ok(format(date, 'dd/MM/yyyy'));
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Invalid date format'));
  }
}

