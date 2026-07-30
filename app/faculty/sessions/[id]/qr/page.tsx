import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FullPageQRClient from "@/components/faculty/FullPageQRClient";

interface FullPageQRProps {
  params: { id: string };
}

export default async function FullPageQRPage({ params }: FullPageQRProps) {
  const authSession = await auth();
  if (!authSession?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: authSession.user.id },
    select: { id: true, role: true },
  });
  if (!user || !["FACULTY", "HOD", "ADMIN"].includes(user.role)) {
    redirect("/login");
  }

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { course: true },
  });

  if (!session) redirect("/faculty/dashboard");

  if (session.facultyId !== user.id && user.role === "FACULTY") {
    redirect("/faculty/dashboard");
  }

  if (session.status !== "ACTIVE") {
    redirect(`/faculty/sessions/${params.id}/summary`);
  }

  return (
    <FullPageQRClient
      sessionId={params.id}
      courseName={session.course.name}
      courseCode={session.course.code}
    />
  );
}
