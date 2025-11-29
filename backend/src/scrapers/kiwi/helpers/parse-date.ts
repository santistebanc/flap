/**
 * Parse DD/MM/YYYY to YYYY-MM-DD format
 */
import { format, parse } from 'date-fns';

export function parseDateToISO(dateStr: string): string {
    try {
        const date = parse(dateStr, 'dd/MM/yyyy', new Date());
        return format(date, 'yyyy-MM-dd');
    } catch {
        return dateStr;
    }
}

