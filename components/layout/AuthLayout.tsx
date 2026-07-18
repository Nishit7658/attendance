import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function AuthLayout({ children, title, className }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div
        className={cn(
          "w-full max-w-sm rounded-[var(--radius-lg)] bg-bg p-8",
          className
        )}
      >
        {title && (
          <h1 className="mb-6 text-center text-[var(--fs-headline)] font-[var(--fw-semibold)] text-ink">
            {title}
          </h1>
        )}
        {children}
      </div>
    </div>
  );
}
