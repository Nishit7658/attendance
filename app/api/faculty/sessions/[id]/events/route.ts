import { NextRequest } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { generateQrToken, getQrExpiry } from "@/lib/qr-token";
import { getSystemConfigNumber } from "@/lib/system-config";
import { subscribeAttendanceChange } from "@/lib/attendance-events";
import {
  buildSessionRoster,
  type RosterStatus,
  type RosterStudent,
} from "@/lib/session-roster";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** How often the DB is checked for attendance changes (cross-instance safety net). */
const ATTENDANCE_POLL_MS = 400;

interface KnownRecord {
  status: RosterStatus;
  isFlagged: boolean;
  flagReason: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let user;
  try {
    user = await requireRole(["FACULTY", "HOD", "ADMIN"]);
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 500;
    return new Response(
      err instanceof Error ? err.message : "Unauthorized",
      { status }
    );
  }

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { id: true, facultyId: true },
  });
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }
  // Only FACULTY must own the session; HOD/Admin can view any session
  if (user.role === "FACULTY" && session.facultyId !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const sessionId = params.id;
  const encoder = new TextEncoder();
  const intervalSec = await getSystemConfigNumber("qr_refresh_interval", 5);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let polling = false;
      let pollAgain = false;

      const timers: {
        keepAlive?: ReturnType<typeof setInterval>;
        token?: ReturnType<typeof setInterval>;
        attendance?: ReturnType<typeof setInterval>;
        safety?: ReturnType<typeof setTimeout>;
      } = {};
      let unsubscribe: (() => void) | null = null;

      // Last known state per student, used to compute deltas.
      const known = new Map<string, KnownRecord>();
      // Student identity cache so deltas don't need a join on every poll.
      const identity = new Map<string, { name: string; rollNo: string }>();

      const send = (event: string, data: unknown): void => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // stream already closed
        }
      };

      const cleanup = (): void => {
        if (closed) return;
        closed = true;
        if (timers.keepAlive) clearInterval(timers.keepAlive);
        if (timers.token) clearInterval(timers.token);
        if (timers.attendance) clearInterval(timers.attendance);
        if (timers.safety) clearTimeout(timers.safety);
        if (unsubscribe) unsubscribe();
        request.signal.removeEventListener("abort", cleanup);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const sendToken = async (): Promise<void> => {
        try {
          const current = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { status: true },
          });
          if (!current || current.status !== "ACTIVE") {
            send("session-ended", {});
            cleanup();
            return;
          }
          const token = await generateQrToken(sessionId, intervalSec);
          send("token", { token, expiresAt: getQrExpiry(intervalSec) });
        } catch (err) {
          console.error("SSE token error for session", sessionId, err);
        }
      };

      const pollAttendance = async (): Promise<void> => {
        if (closed) return;
        // Coalesce overlapping triggers into one extra pass.
        if (polling) {
          pollAgain = true;
          return;
        }
        polling = true;
        try {
          do {
            pollAgain = false;
            const rows = await prisma.attendanceRecord.findMany({
              where: { sessionId },
              select: {
                studentId: true,
                status: true,
                isFlagged: true,
                flagReason: true,
              },
            });

            const changed = rows.filter((r) => {
              const prev = known.get(r.studentId);
              return (
                !prev ||
                prev.status !== r.status ||
                prev.isFlagged !== r.isFlagged ||
                prev.flagReason !== r.flagReason
              );
            });

            const unknownIds = changed
              .map((r) => r.studentId)
              .filter((id) => !identity.has(id));
            if (unknownIds.length > 0) {
              const users = await prisma.user.findMany({
                where: { id: { in: unknownIds } },
                select: { id: true, name: true, enrollmentNo: true, email: true },
              });
              for (const u of users) {
                identity.set(u.id, {
                  name: u.name,
                  rollNo: u.enrollmentNo ?? u.email,
                });
              }
            }

            for (const r of changed) {
              known.set(r.studentId, {
                status: r.status,
                isFlagged: r.isFlagged,
                flagReason: r.flagReason,
              });
              const who = identity.get(r.studentId);
              const student: RosterStudent = {
                id: r.studentId,
                name: who?.name ?? "Unknown Student",
                rollNo: who?.rollNo ?? r.studentId,
                status: r.status,
                isFlagged: r.isFlagged,
                flagReason: r.flagReason,
              };
              send("student_marked", { type: "student_marked", student });
            }

            // Records that disappeared (e.g. deleted) revert to unmarked.
            const liveIds = new Set(rows.map((r) => r.studentId));
            for (const id of Array.from(known.keys())) {
              if (liveIds.has(id)) continue;
              known.delete(id);
              const who = identity.get(id);
              send("student_marked", {
                type: "student_marked",
                student: {
                  id,
                  name: who?.name ?? "Unknown Student",
                  rollNo: who?.rollNo ?? id,
                  status: null,
                  isFlagged: false,
                  flagReason: null,
                } satisfies RosterStudent,
              });
            }
          } while (pollAgain && !closed);
        } catch (err) {
          console.error("SSE attendance error for session", sessionId, err);
        } finally {
          polling = false;
        }
      };

      if (request.signal.aborted) {
        cleanup();
        return;
      }
      request.signal.addEventListener("abort", cleanup, { once: true });

      // Keep-alive ping
      timers.keepAlive = setInterval(() => send("ping", {}), 10_000);

      // Safety timeout — close after 55 minutes (just under serverless limit)
      timers.safety = setTimeout(cleanup, 55 * 60 * 1000);

      // 1) Initial full roster in the stream itself (no extra HTTP round trip).
      try {
        const roster = await buildSessionRoster(sessionId);
        for (const s of roster) {
          identity.set(s.id, { name: s.name, rollNo: s.rollNo });
          if (s.status !== null) {
            known.set(s.id, {
              status: s.status,
              isFlagged: s.isFlagged,
              flagReason: s.flagReason,
            });
          }
        }
        send("roster", { students: roster });
      } catch (err) {
        console.error("SSE roster error for session", sessionId, err);
      }

      // 2) QR token immediately + on every rotation.
      void sendToken();
      timers.token = setInterval(
        () => void sendToken(),
        Math.max(2, intervalSec) * 1000
      );

      // 3) Attendance deltas: instant nudge from same-instance writes plus a
      //    fast poll for writes handled by other instances.
      unsubscribe = subscribeAttendanceChange(sessionId, () => {
        void pollAttendance();
      });
      timers.attendance = setInterval(
        () => void pollAttendance(),
        ATTENDANCE_POLL_MS
      );
    },
    cancel() {
      // Client disconnected; abort listener in start() performs cleanup.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
