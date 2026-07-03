import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

export type EditLogEntry = {
  id: string;
  oldStatus: string;
  newStatus: string;
  editedBy: { name: string };
  editedAt: string;
  reason: string | null;
};

interface EditHistoryProps {
  logs: EditLogEntry[];
}

function statusVariant(status: string) {
  switch (status) {
    case "PRESENT":
      return "success" as const;
    case "ABSENT":
      return "danger" as const;
    case "LATE":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export function EditHistory({ logs }: EditHistoryProps) {
  if (logs.length === 0) {
    return (
      <p className="py-2 text-xs text-slate-400">No edit history available.</p>
    );
  }

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        Edit History
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Old Status</TableHead>
            <TableHead>New Status</TableHead>
            <TableHead>Edited By</TableHead>
            <TableHead>Edited At</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <Badge variant={statusVariant(log.oldStatus)}>{log.oldStatus}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(log.newStatus)}>{log.newStatus}</Badge>
              </TableCell>
              <TableCell>{log.editedBy.name}</TableCell>
              <TableCell className="text-xs text-slate-500">
                {new Date(log.editedAt).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs text-slate-500">
                {log.reason || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
