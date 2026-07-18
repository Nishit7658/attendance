import { cn } from "@/lib/utils";

export interface TimetableEntry {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  facultyName?: string;
  room: string;
  section: string;
}

interface TimetableGridProps {
  entries: TimetableEntry[];
  showFaculty?: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function TimetableGrid({ entries, showFaculty = false }: TimetableGridProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center">
        <p className="text-sm text-muted">No timetable entries found.</p>
      </div>
    );
  }

  // Group by time slots
  const timeSlots = [...new Set(entries.map((e) => `${formatTime(e.startTime)} – ${formatTime(e.endTime)}`))].sort();

  // Days to show (Mon-Fri, or all days that have entries)
  const activeDays = [...new Set(entries.map((e) => e.dayOfWeek))].sort();
  // Always show Mon-Fri at minimum
  const displayDays = activeDays.length > 0 ? activeDays : [1, 2, 3, 4, 5];

  // Build cell map: dayOfWeek + timeSlotKey → entries[]
  const cellMap = new Map<string, TimetableEntry[]>();
  for (const entry of entries) {
    const key = `${entry.dayOfWeek}|${formatTime(entry.startTime)}–${formatTime(entry.endTime)}`;
    if (!cellMap.has(key)) cellMap.set(key, []);
    cellMap.get(key)!.push(entry);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="bg-surface">
            <th className="sticky left-0 z-10 bg-surface px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted min-w-[100px]">
              Time
            </th>
            {displayDays.map((day) => (
              <th
                key={day}
                className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted min-w-[130px]"
              >
                {DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-bg">
          {timeSlots.map((slot) => (
            <tr key={slot} className="hover:bg-surface-hover">
              <td className="sticky left-0 z-10 bg-bg px-3 py-3 text-xs font-medium text-muted whitespace-nowrap border-r border-border">
                {slot}
              </td>
              {displayDays.map((day) => {
                const cellEntries = cellMap.get(`${day}|${slot}`) ?? [];
                return (
                  <td
                    key={`${day}-${slot}`}
                    className={cn(
                      "px-3 py-2 align-top border-l border-border/50",
                      cellEntries.length === 0 && "bg-bg/50"
                    )}
                  >
                    {cellEntries.length === 0 ? (
                      <span className="block text-center text-xs text-muted/50">—</span>
                    ) : (
                      <div className="space-y-1.5">
                        {cellEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded border border-primary/20 bg-primary/10 px-2 py-1.5"
                          >
                            <p className="text-xs font-semibold text-primary">
                              {entry.courseCode}
                            </p>
                            <p className="text-[11px] text-ink leading-tight mt-0.5">
                              {entry.courseName}
                            </p>
                            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted">
                              <span>Room {entry.room}</span>
                              {entry.section && <span>Sec {entry.section}</span>}
                              {showFaculty && entry.facultyName && (
                                <span>{entry.facultyName}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
