/**
 * Convert DD/MM/YYYY to YYYY-MM-DD format
 */
import { format, parse } from 'date-fns';
import { Result, ok, err } from 'neverthrow';

export function convertKiwiDateToISO(dateStr: string): string {
  const result = convertKiwiDateToISOSafe(dateStr);
  return result.isOk() ? result.value : dateStr;
}

export function convertKiwiDateToISOSafe(dateStr: string): Result<string, Error> {
  try {
    const date = parse(dateStr, 'dd/MM/yyyy', new Date());
    return ok(format(date, 'yyyy-MM-dd'));
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Invalid date format'));
  }
}

