/**
 * Parse date string to YYYY-MM-DD format
 */
import { format, parse } from 'date-fns';

export function convertDateToYYYYMMDD(dateStr: string | null): string | null {
    if (!dateStr) return null;

    try {
        // Parse formats like "11 Dec 2025" or "Mon, 11 Dec 2025"
        // Try common date formats
        const formats = ['d MMM yyyy', 'EEE, d MMM yyyy', 'd MMMM yyyy', 'EEE, d MMMM yyyy'];
        
        for (const fmt of formats) {
            try {
                const date = parse(dateStr, fmt, new Date());
                return format(date, 'yyyy-MM-dd');
            } catch {
                // Try next format
                continue;
            }
        }
        
        return null;
    } catch {
        return null;
    }
}

