import { parse, isValid, format } from 'date-fns';

// Common date formats to try parsing
const DATE_FORMATS = [
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'dd-MM-yyyy',
  'MM-dd-yyyy',
  'dd.MM.yyyy',
  'MM.dd.yyyy',
  'yyyy/MM/dd',
];

export function parseDate(dateStr: string): string | null {
  // Remove any surrounding quotes and trim whitespace
  dateStr = dateStr.replace(/^["']|["']$/g, '').trim();

  // Try each format until we find one that works
  for (const dateFormat of DATE_FORMATS) {
    const parsedDate = parse(dateStr, dateFormat, new Date());
    if (isValid(parsedDate)) {
      // Always return in yyyy-MM-dd format for database storage
      return format(parsedDate, 'yyyy-MM-dd');
    }
  }

  return null;
}

export function cleanAmount(amount: string): string {
  // Remove currency symbols, commas, and surrounding whitespace/quotes
  let cleanedAmount = amount
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/[£$€]/g, '') // Remove currency symbols
    .replace(/,/g, '') // Remove commas
    .trim();

  // Handle parentheses for negative numbers (e.g., "(100.00)" -> "-100.00")
  if (cleanedAmount.startsWith('(') && cleanedAmount.endsWith(')')) {
    cleanedAmount = '-' + cleanedAmount.slice(1, -1);
  }

  // Convert to number and back to string to ensure valid format
  const numAmount = parseFloat(cleanedAmount);
  return isNaN(numAmount) ? '0' : numAmount.toString();
}

export function cleanDescription(description: string): string {
  return description
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}
