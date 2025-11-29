/**
 * Parse connection time string (e.g., "7h 50", "2h 30m", "45m") to minutes
 */
export function parseConnectionTimeToMinutes(connectionTimeStr: string | null | undefined): number | null {
  if (!connectionTimeStr) return null;
  
  const cleaned = connectionTimeStr.trim();
  
  // Try to match patterns like "7h 50", "2h 30m", "45m", etc.
  const hourMatch = cleaned.match(/(\d+)\s*h/i);
  const minuteMatch = cleaned.match(/(\d+)\s*m/i);
  
  // If there's a number after "h" but no "m", it might be minutes (e.g., "7h 50")
  let hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  let minutes = 0;
  
  if (minuteMatch) {
    minutes = parseInt(minuteMatch[1], 10);
  } else if (hourMatch) {
    // Check if there's a number after the hours (e.g., "7h 50")
    const afterHour = cleaned.substring(hourMatch.index! + hourMatch[0].length).trim();
    const numberMatch = afterHour.match(/^(\d+)/);
    if (numberMatch) {
      minutes = parseInt(numberMatch[1], 10);
    }
  } else {
    // No hour match, try to parse as just minutes
    const justMinutes = cleaned.match(/^(\d+)$/);
    if (justMinutes) {
      minutes = parseInt(justMinutes[1], 10);
    }
  }
  
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes > 0 ? totalMinutes : null;
}

