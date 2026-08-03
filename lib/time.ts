/**
 * Application Time Conventions
 * 
 * Timetable entries are stored in the database as UTC dates on 1970-01-01, 
 * but the raw hour/minute values MATCH the IST local time.
 * For example: 09:30 AM IST is stored as 1970-01-01T09:30:00.000Z.
 * 
 * Therefore, when reading from a TimetableEntry, extract the UTC values.
 * When comparing against the current time, you must calculate the current time in IST.
 */

/**
 * Returns the current time (or given absolute Date) as total minutes from midnight in IST.
 * @param date A standard Date object (e.g. `new Date()`)
 */
export function getAbsoluteISTMinutes(date: Date = new Date()): number {
  const utcMs = date.getTime();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(utcMs + istOffsetMs);
  
  return istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
}

/**
 * Extracts the total minutes from midnight from a TimetableEntry date.
 * Because these are stored with UTC matching the IST time, we just read UTC.
 * @param timetableDate The Date object from a TimetableEntry (e.g., 1970-01-01T09:30:00Z)
 */
export function getTimetableMinutes(timetableDate: Date): number {
  return timetableDate.getUTCHours() * 60 + timetableDate.getUTCMinutes();
}

/**
 * Formats a TimetableEntry date to an AM/PM string.
 * @param timetableDate The Date object from a TimetableEntry
 */
export function formatTimetableTime(timetableDate: Date): string {
  let hours = timetableDate.getUTCHours();
  const minutes = timetableDate.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const minStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minStr} ${ampm}`;
}
