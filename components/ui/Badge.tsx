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
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-[var(--fs-caption)] font-[var(--fw-medium)]",
        variant === "success" && "bg-success-bg text-success",
        variant === "danger" && "bg-error-bg text-error",
        variant === "warning" && "bg-amber-100 text-amber-800",
        variant === "neutral" && "bg-surface border border-border text-ink",
        variant === "default" && "bg-primary/10 text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}
