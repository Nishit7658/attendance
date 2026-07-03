import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQrToken, getQrExpiry } from "@/lib/qr-token";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authSession = await auth();
  if (!authSession?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authSession.user.id },
    select: { id: true, role: true },
  });
  if (!user || !["FACULTY", "HOD", "ADMIN"].includes(user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const session = await prisma.session.findUnique({
    where: { id: params.id },
  });
  if (!session || session.facultyId !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const keepAlive: ReturnType<typeof setInterval> = setInterval(() => {
        if (closed) return;
        send("ping", {});
      }, 10000);

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // stream closed
        }
      };

      const interval = setInterval(async () => {
        try {
          const current = await prisma.session.findUnique({
            where: { id: params.id },
          });

          if (!current || current.status !== "ACTIVE") {
            send("session-ended", {});
            cleanup();
            return;
          }

          const token = await generateQrToken(params.id);
          const expiresAt = getQrExpiry();
          send("token", { token, expiresAt });

          const records = await prisma.attendanceRecord.findMany({
            where: { sessionId: params.id },
          });
          const present = records.filter(
            (r) => r.status === "PRESENT"
          ).length;
          const late = records.filter(
            (r) => r.status === "LATE"
          ).length;
          const absent = records.filter(
            (r) => r.status === "ABSENT"
          ).length;
          send("attendance", {
            present,
            late,
            absent,
            total: records.length,
          });
        } catch (err) {
          console.error("SSE error for session", params.id, err);
        }
      }, 3000);



      // Safety timeout — close after 55 minutes (just under serverless limit)
      const safetyTimeout = setTimeout(() => {
        if (!closed) cleanup();
      }, 55 * 60 * 1000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearInterval(keepAlive);
        clearTimeout(safetyTimeout);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
