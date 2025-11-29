/**
 * Convert DD/MM/YYYY to YYYY-MM-DD format
 */
import { format, parse } from 'date-fns';
import { Result, Ok, Err } from 'ts-results';

export function convertKiwiDateToISO(dateStr: string): string {
  const result = convertKiwiDateToISOSafe(dateStr);
  return result.ok ? result.val : dateStr;
}

export function convertKiwiDateToISOSafe(dateStr: string): Result<string, Error> {
  try {
    const date = parse(dateStr, 'dd/MM/yyyy', new Date());
    return Ok(format(date, 'yyyy-MM-dd'));
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Invalid date format'));
  }
}

