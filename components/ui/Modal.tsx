"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

let bodyScrollCounter = 0;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = title ? `modal-title-${title.replace(/\s+/g, "-").toLowerCase()}` : undefined;
  const descId = description ? `modal-desc-${description.replace(/\s+/g, "-").toLowerCase()}` : undefined;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && contentRef.current) {
        const focusable =
          contentRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement;

    document.addEventListener("keydown", handleKeyDown);

    bodyScrollCounter++;
    if (bodyScrollCounter === 1) {
      document.body.style.overflow = "hidden";
    }

    document.querySelectorAll("#__next, #root, [data-main-content]").forEach((el) => {
      el.setAttribute("aria-hidden", "true");
    });

    const firstFocusable = contentRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      bodyScrollCounter--;
      if (bodyScrollCounter <= 0) {
        document.body.style.overflow = "";
      }
      document.querySelectorAll("#__next, #root, [data-main-content]").forEach((el) => {
        el.removeAttribute("aria-hidden");
      });
      triggerRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "w-full max-w-md rounded-[var(--radius-lg)] bg-bg p-6",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.12)]",
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h2 id={titleId} className="text-[var(--fs-title)] font-[var(--fw-semibold)] text-ink">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {description && (
          <p id={descId} className="sr-only">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
