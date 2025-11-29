/**
 * Convert YYYY-MM-DD to DD/MM/YYYY format (for Kiwi scraper)
 */
import { format, parse } from 'date-fns';
import { Result, Ok, Err } from 'ts-results';

export function convertDateToKiwiFormat(dateStr: string): string {
  const result = convertDateToKiwiFormatSafe(dateStr);
  return result.ok ? result.val : dateStr;
}

export function convertDateToKiwiFormatSafe(dateStr: string): Result<string, Error> {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return Ok(format(date, 'dd/MM/yyyy'));
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Invalid date format'));
  }
}

