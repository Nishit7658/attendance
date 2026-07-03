import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRScanner from "@/components/student/QRScanner";

export default async function ScanPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!currentUser || currentUser.role !== "STUDENT") redirect("/faculty/dashboard");

  return (
    <div className="flex flex-col items-center py-6">
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Scan QR Code</h1>
      <QRScanner />
    </div>
  );
}
