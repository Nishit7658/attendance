import { cn } from "@/lib/utils";

interface TableProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function Table({ children, className, ariaLabel }: TableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table
        className="min-w-full divide-y divide-border"
        role="table"
        aria-label={ariaLabel}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className }: TableProps) {
  return <thead className={cn("bg-surface border-b border-border", className)}>{children}</thead>;
}

export function TableBody({ children, className }: TableProps) {
  return <tbody className={cn("divide-y divide-border bg-bg", className)}>{children}</tbody>;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  className?: string;
}

export function TableRow({ children, className, tabIndex, ...props }: TableRowProps) {
  return (
    <tr
      className={cn("hover:bg-surface-hover transition-colors", className)}
      tabIndex={tabIndex ?? -1}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className, ...props }: TableProps & React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-left text-[var(--fs-label)] font-[var(--fw-medium)] text-muted tracking-[0.01em]",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }: TableProps & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("whitespace-nowrap px-4 py-3 text-[var(--fs-body)] text-ink", className)} {...props}>{children}</td>;
}
