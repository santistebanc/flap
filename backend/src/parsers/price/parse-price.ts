/**
 * Parse price string (remove commas and convert to number)
 */
export function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

