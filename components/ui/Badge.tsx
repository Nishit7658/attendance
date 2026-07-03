import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "default" | "success" | "danger" | "warning" | "neutral";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "success" && "bg-green-100 text-green-800",
        variant === "danger" && "bg-red-100 text-red-800",
        variant === "warning" && "bg-amber-100 text-amber-800",
        variant === "neutral" && "bg-slate-100 text-slate-700",
        variant === "default" && "bg-navy-100 text-navy-800",
        className,
      )}
    >
      {children}
    </span>
  );
}
