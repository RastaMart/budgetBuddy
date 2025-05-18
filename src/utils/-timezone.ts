import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { format, parseISO } from 'date-fns';

export function UTCToLocal(date: Date): Date {
  // Convert UTC date to the specified timezone
  const localDate = new Date(date.toISOString());
  localDate.setMinutes(localDate.getMinutes() + localDate.getTimezoneOffset());
  return localDate;
}

export function formatToUTCString(
  date: Date | string,
  timezone: string
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const utcDate = fromZonedTime(dateObj, timezone);
  return format(utcDate, 'yyyy-MM-dd');
}

export function formatToLocalString(date: string, timezone: string): string {
  return formatInTimeZone(parseISO(date), timezone, 'yyyy-MM-dd');
}
