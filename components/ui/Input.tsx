"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, id, disabled, ...props }, ref) => {
    const fallbackId = useId();
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-") || fallbackId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[var(--fs-label)] font-[var(--fw-medium)] text-[var(--color-ink)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            "h-10 rounded-[var(--radius-md)] border bg-[var(--color-bg)] px-3 text-[var(--fs-body)] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-[var(--color-error)]"
              : "border-[var(--color-border)]",
            className
          )}
          aria-invalid={!!error}
          aria-required={props.required || undefined}
          aria-labelledby={label ? `${inputId}-label` : undefined}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-[var(--fs-caption)] text-[var(--color-error)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="text-[var(--fs-caption)] text-[var(--color-muted)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
