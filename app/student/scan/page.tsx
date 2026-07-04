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

      <div className="mt-8 max-w-sm text-center">
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
            Can&apos;t scan? Click here for help
          </summary>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left">
            <p className="text-xs text-slate-600 mb-2">
              <strong>Having trouble scanning?</strong> Make sure:
            </p>
            <ul className="list-disc pl-4 text-xs text-slate-500 space-y-1">
              <li>You&apos;re in a well-lit area with the QR code clearly visible</li>
              <li>Camera permission is granted in your browser settings</li>
              <li>The QR code is not damaged or distorted</li>
              <li>Your device has a working rear camera</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              If you still can&apos;t scan, please ask your faculty member to mark
              your attendance manually.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
