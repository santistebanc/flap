/**
 * Parse duration string (e.g., "14h 05", "23h 40", "12h", "3h 30m", "3h30m", "3:30", "195m", "195") to minutes
 */
export function parseDurationToMinutes(durationStr: string | null | undefined): number {
  if (!durationStr) return 0;
  
  const cleaned = durationStr.trim();
  
  // Handle format "H:MM" or "HH:MM" (e.g., "3:30", "12:45")
  const colonMatch = cleaned.match(/^(\d+):(\d+)$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    return hours * 60 + minutes;
  }
  
  // Handle formats with 'h' and optional minutes
  // Format can be: "14h 05", "23h 40", "12h", "3h 30m", "3h30m", "45m"
  // First try to match "Xh YY" or "Xh YYm" (hours followed by space and minutes, with or without 'm')
  const fullMatchWithSpace = cleaned.match(/(\d+)\s*h\s+(\d+)(?:\s*m)?\s*$/i);
  if (fullMatchWithSpace) {
    const hours = parseInt(fullMatchWithSpace[1], 10);
    const minutes = parseInt(fullMatchWithSpace[2], 10);
    return hours * 60 + minutes;
  }
  
  // Try to match "XhYm" or "Xh Ym" (with 'm' suffix)
  const fullMatchWithM = cleaned.match(/(\d+)\s*h\s*(\d+)\s*m/i);
  if (fullMatchWithM) {
    const hours = parseInt(fullMatchWithM[1], 10);
    const minutes = parseInt(fullMatchWithM[2], 10);
    return hours * 60 + minutes;
  }
  
  // Match hours and minutes separately
  // For hours: digits followed by 'h' (e.g., "3h", "12h")
  const hourMatch = cleaned.match(/(\d+)\s*h/i);
  // For minutes: digits followed by 'm' (e.g., "30m", "45m")
  const minuteMatch = cleaned.match(/(\d+)\s*m/i);
  
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
  
  // If we found hours or minutes, return the sum
  if (hours > 0 || minutes > 0) {
    return hours * 60 + minutes;
  }
  
  // If no 'h' or 'm' found, try to parse as pure minutes (e.g., "195")
  const pureMinutes = parseInt(cleaned, 10);
  if (!isNaN(pureMinutes)) {
    return pureMinutes;
  }
  
  return 0;
}

