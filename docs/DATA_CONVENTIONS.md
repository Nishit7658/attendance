# Data Conventions

## Timezone Handling
- **Database Storage**: All times for timetables are stored as timestamps relative to `1970-01-01` UTC.
- **Application Logic**: The application targets India Standard Time (IST, UTC+5:30).
- **Helper Utilities**: Use the utilities in `lib/time.ts` (e.g., `getAbsoluteISTMinutes`, `getTimetableMinutes`, `formatTimetableTime`) for all time manipulation.
- **NEVER** use `Date.getUTCHours()` directly when formatting UI elements, as it will render times incorrectly by 5.5 hours.
