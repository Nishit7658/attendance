import { cn } from "@/lib/utils";

interface AttendanceStatsProps {
  total: number;
  present: number;
  absent: number;
  late: number;
  className?: string;
}

export function AttendanceStats({ total, present, absent, late, className }: AttendanceStatsProps) {
  const stats = [
    { label: "Total", value: total, color: "text-slate-900" },
    { label: "Present", value: present, color: "text-green-700" },
    { label: "Absent", value: absent, color: "text-red-700" },
    { label: "Late", value: late, color: "text-amber-700" },
  ];

  return (
    <div className={cn("flex items-center gap-8", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col items-center">
          <span className={cn("text-2xl font-semibold", stat.color)}>{stat.value}</span>
          <span className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
