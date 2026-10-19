import { NextRequest } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { generateQrToken, getQrExpiry } from "@/lib/qr-token";
import { getSystemConfigNumber } from "@/lib/system-config";
import { buildSessionRoster } from "@/lib/session-roster";

interface StudentDelta {
  id: string;
  name: string;
  rollNo: string;
  status: string;
  isFlagged: boolean;
  flagReason: string | null;
}

interface KnownRecordState {
  status: string;
  isFlagged: boolean;
  flagReason: string | null;
}

const ATTENDANCE_POLL_INTERVAL_MS = 300;
const KEEP_ALIVE_INTERVAL_MS = 10000;
const SAFETY_TIMEOUT_MS = 55 * 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let user;
  try {
    user = await requireRole(["FACULTY", "HOD", "ADMIN"]);
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 500;
    return new Response(err instanceof Error ? err.message : "Unauthorized", { status });
  }

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { id: true, facultyId: true, status: true },
  });
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }
  // Only FACULTY must own the session; HOD/Admin can view any session
  if (user.role === "FACULTY" && session.facultyId !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let isCheckingAttendance = false;
      let isGeneratingToken = false;
      let initialSnapshotSent = false;
      const knownRecords = new Map<string, KnownRecordState>();

      let cleanup = () => {};

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream closed by client
        }
      };

      const keepAlive = setInterval(() => {
        if (closed) return;
        send("ping", {});
      }, KEEP_ALIVE_INTERVAL_MS);

      getSystemConfigNumber("qr_refresh_interval", 5)
        .then((intervalSec: number) => {
          if (closed) return;

          const rotateTokenTick = async () => {
            if (closed || isGeneratingToken) return;
            isGeneratingToken = true;
            try {
              const current = await prisma.session.findUnique({
                where: { id: params.id },
                select: { status: true },
              });

              if (!current || current.status !== "ACTIVE") {
                send("session-ended", {});
                cleanup();
                return;
              }

              const token = await generateQrToken(params.id, intervalSec);
              const expiresAt = getQrExpiry(intervalSec);
              send("token", { token, expiresAt });
            } catch (err) {
              console.error("SSE token error for session", params.id, err);
            } finally {
              isGeneratingToken = false;
            }
          };

          const checkAttendanceDeltas = async () => {
            if (closed || isCheckingAttendance) return;
            isCheckingAttendance = true;
            try {
              const records = await prisma.attendanceRecord.findMany({
                where: { sessionId: params.id },
                select: {
                  studentId: true,
                  status: true,
                  isFlagged: true,
                  flagReason: true,
                  student: {
                    select: {
                      id: true,
                      name: true,
                      enrollmentNo: true,
                      email: true,
                    },
                  },
                },
              });

              const changedStudents: StudentDelta[] = [];
              let present = 0;
              let late = 0;
              let absent = 0;

              for (const record of records) {
                if (record.status === "PRESENT") present++;
                else if (record.status === "LATE") late++;
                else if (record.status === "ABSENT") absent++;

                const prev = knownRecords.get(record.studentId);
                const flagReason = record.flagReason ?? null;

                if (
                  !prev ||
                  prev.status !== record.status ||
                  prev.isFlagged !== record.isFlagged ||
                  prev.flagReason !== flagReason
                ) {
                  knownRecords.set(record.studentId, {
                    status: record.status,
                    isFlagged: record.isFlagged,
                    flagReason,
                  });

                  const delta: StudentDelta = {
                    id: record.student.id,
                    name: record.student.name,
                    rollNo: record.student.enrollmentNo ?? record.student.email,
                    status: record.status,
                    isFlagged: record.isFlagged,
                    flagReason,
                  };

                  changedStudents.push(delta);

                  // Emit immediate per-student delta event for sub-500ms optimistic UI updates
                  send("student_marked", {
                    type: "student_marked",
                    student: delta,
                  });
                }
              }

              if (!initialSnapshotSent || changedStudents.length > 0) {
                initialSnapshotSent = true;
                send("attendance", {
                  type: changedStudents.length > 0 ? "student_marked" : "attendance",
                  present,
                  late,
                  absent,
                  total: records.length,
                  student: changedStudents[0] ?? null,
                  students: changedStudents,
                });
              }
            } catch (err) {
              console.error("SSE attendance delta error for session", params.id, err);
            } finally {
              isCheckingAttendance = false;
            }
          };

          const pushInitialRoster = async () => {
            if (closed) return;
            try {
              const fullRoster = await buildSessionRoster(params.id);
              if (closed) return;
              send("roster", { students: fullRoster });
            } catch (err) {
              console.error("SSE roster push error for session", params.id, err);
            }
          };

          // Execute initial token emission, roster push & attendance check immediately
          void rotateTokenTick();
          void pushInitialRoster();
          void checkAttendanceDeltas();

          const tokenIntervalMs = Math.max(2, intervalSec) * 1000;
          const tokenTimer = setInterval(() => {
            void rotateTokenTick();
          }, tokenIntervalMs);

          const attendanceTimer = setInterval(() => {
            void checkAttendanceDeltas();
          }, ATTENDANCE_POLL_INTERVAL_MS);

          const safetyTimeout = setTimeout(() => {
            if (!closed) cleanup();
          }, SAFETY_TIMEOUT_MS);

          const onAbort = () => {
            cleanup();
          };

          cleanup = () => {
            if (closed) return;
            closed = true;
            clearInterval(tokenTimer);
            clearInterval(attendanceTimer);
            clearInterval(keepAlive);
            clearTimeout(safetyTimeout);
            try {
              request.signal.removeEventListener("abort", onAbort);
            } catch {
              // ignore
            }
            try {
              controller.close();
            } catch {
              // already closed
            }
          };

          if (request.signal.aborted) {
            cleanup();
          } else {
            request.signal.addEventListener("abort", onAbort, { once: true });
          }
        })
        .catch((err) => {
          console.error("SSE config initialization error", err);
          clearInterval(keepAlive);
          try {
            controller.close();
          } catch {
            // ignore
          }
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}