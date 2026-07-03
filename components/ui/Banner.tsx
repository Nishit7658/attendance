import { cn } from "@/lib/utils";

interface BannerProps {
  variant?: "info" | "success" | "error" | "warning";
  children: React.ReactNode;
  className?: string;
}

export function Banner({ variant = "info", children, className }: BannerProps) {
  const isAlert = variant === "error" || variant === "success" || variant === "warning";

  return (
    <div
      role={isAlert ? "alert" : undefined}
      aria-live={isAlert ? "assertive" : "polite"}
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        variant === "info" && "border-blue-200 bg-blue-50 text-blue-800",
        variant === "success" && "border-green-200 bg-green-50 text-green-800",
        variant === "error" && "border-red-200 bg-red-50 text-red-800",
        variant === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        className,
      )}
    >
      {children}
    </div>
  );
}
