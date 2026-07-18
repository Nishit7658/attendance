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
            className="text-[var(--fs-label)] font-[var(--fw-medium)] text-ink"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            "h-10 rounded-md border bg-bg px-3 text-[13px] text-ink placeholder:text-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 shadow-sm",
            error
              ? "border-error focus-visible:ring-error focus-visible:border-error"
              : "border-border hover:border-muted",
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
            className="text-[var(--fs-caption)] text-error"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="text-[var(--fs-caption)] text-muted"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
