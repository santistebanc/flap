/**
 * Parse time string to 24-hour format
 */
export function parseTimeTo24Hour(timeStr: string | null): string | null {
    if (!timeStr) return null;
    const cleaned = timeStr.trim();

    // If already in 24-hour format (HH:MM), return as is
    if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
        const [hours, minutes] = cleaned.split(':');
        return `${hours.padStart(2, '0')}:${minutes}`;
    }

    // Try to parse 12-hour format (e.g., "10:30 AM" or "2:45 PM")
    const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2];
        const period = timeMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }

        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    return null;
}

