import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function HODFacultyPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { branch: true }
  });

  if (!currentUser || (currentUser.role !== "HOD" && currentUser.role !== "ADMIN")) {
    redirect("/faculty/dashboard");
  }

  const branch = currentUser.branch;
  if (!branch) {
    return <p className="text-sm text-muted">No department assigned.</p>;
  }

  const facultyList = await prisma.user.findMany({
    where: { role: "FACULTY", branchId: branch.id },
    select: { id: true, name: true, email: true },
  });

  const todaySessionCounts = await prisma.session.groupBy({
    by: ["facultyId"],
    where: {
      facultyId: { in: facultyList.map((f) => f.id) },
      date: new Date(),
    },
    _count: { id: true },
  });

  const countMap = new Map(todaySessionCounts.map((s) => [s.facultyId, s._count.id]));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Faculty Members</h1>
      {facultyList.length === 0 ? (
        <EmptyState
          title="No faculty members"
          description="No faculty members found in your department."
        />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Sessions Today</TableHead>
              <TableHead>Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {facultyList.map((faculty) => {
              const sessionCount = countMap.get(faculty.id) ?? 0;
              return (
                <TableRow key={faculty.id}>
                  <TableCell className="font-medium text-ink">
                    {faculty.name}
                  </TableCell>
                  <TableCell>{faculty.email}</TableCell>
                  <TableCell>
                    <Badge variant={sessionCount > 0 ? "success" : "neutral"}>
                      {sessionCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/hod/sessions?facultyId=${faculty.id}`}>
                      <Button variant="secondary" size="sm">
                        View Schedule
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
