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
        className="min-w-full divide-y divide-slate-200"
        role="table"
        aria-label={ariaLabel}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className }: TableProps) {
  return <thead className={cn("bg-slate-50", className)}>{children}</thead>;
}

export function TableBody({ children, className }: TableProps) {
  return <tbody className={cn("divide-y divide-slate-200 bg-white", className)}>{children}</tbody>;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  className?: string;
}

export function TableRow({ children, className, tabIndex, ...props }: TableRowProps) {
  return (
    <tr
      className={cn("hover:bg-slate-50", className)}
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
        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }: TableProps & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("whitespace-nowrap px-4 py-3 text-sm text-slate-700", className)} {...props}>{children}</td>;
}
