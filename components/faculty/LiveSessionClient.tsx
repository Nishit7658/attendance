"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

interface LiveSessionClientProps {
  sessionId: string;
  courseName: string;
  courseCode: string;
}

interface TokenData {
  token: string;
  expiresAt: number;
}

interface AttendanceData {
  present: number;
  absent: number;
  total: number;
}

interface StudentStatus {
  id: string;
  name: string;
  rollNo: string;
  status: string | null;
}

type MarkStatus = "PRESENT" | "ABSENT" | "LATE";

export default function LiveSessionClient({
  sessionId,
  courseName,
  courseCode,
}: LiveSessionClientProps) {
  const router = useRouter();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [students, setStudents] = useState<StudentStatus[]>([]);
  const [connected, setConnected] = useState(true);
  const [ending, setEnding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [showRoster, setShowRoster] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const mountedRef = useRef(true);
  const qrImgRef = useRef<HTMLImageElement>(null);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch(`/api/faculty/sessions/${sessionId}/students`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          setStudents(data.students);
        }
      }
    } catch {
      // silently fail — roster is secondary
    }
  }, [sessionId]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const es = new EventSource(`/api/faculty/sessions/${sessionId}/events`);
    eventSourceRef.current = es;

    es.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnected(true);
      // Fetch student roster when connection opens
      fetchStudents();
    };

    es.addEventListener("token", (e) => {
      try {
        const data: TokenData = JSON.parse(e.data);
        setTokenData(data);
        QRCode.toDataURL(data.token, {
          width: 256,
          margin: 1,
          color: { dark: "#1e293b", light: "#ffffff" },
        }).then(setQrDataUrl);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("attendance", (e) => {
      try {
        const data: AttendanceData = JSON.parse(e.data);
        setAttendance(data);
        // Refresh roster to reflect newly scanned students
        fetchStudents();
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("session-ended", () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      es.close();
      router.push(`/faculty/sessions/${sessionId}/summary`);
    });

    es.onerror = () => {
      setConnected(false);
      es.close();

      const attempt = reconnectAttemptRef.current;
      if (attempt >= 10) return;

      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      reconnectAttemptRef.current = attempt + 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [sessionId, router, fetchStudents]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      eventSourceRef.current?.close();
    };
  }, [connect]);

  const handleEndSession = useCallback(async () => {
    setEnding(true);
    setError(null);
    try {
      const res = await fetch(`/api/faculty/sessions/${sessionId}/end`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to end session");
      router.push(data.redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setEnding(false);
      setShowConfirm(false);
    }
  }, [sessionId, router]);

  const handleMarkStudent = useCallback(async (studentId: string, status: MarkStatus) => {
    setMarkingId(studentId);
    setError(null);
    try {
      const res = await fetch(
        `/api/faculty/sessions/${sessionId}/attendance/${studentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to mark student");
      }
      // Optimistically update local state
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status } : s))
      );
      await fetchStudents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setMarkingId(null);
    }
  }, [sessionId, fetchStudents]);

  const handlePrintQR = useCallback(() => {
    if (!qrDataUrl) return;
    const win = window.open("");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>QR Code - ${courseCode}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;">
          <img src="${qrDataUrl}" style="width:400px;height:400px;image-rendering:pixelated;" />
          <p style="margin-top:1rem;font-size:1.2rem;color:#333;">${courseName} (${courseCode})</p>
          <p style="color:#999;font-size:0.9rem;">Session QR — refreshes every few seconds</p>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  }, [qrDataUrl, courseName, courseCode]);

  const expiresIn = tokenData
    ? Math.max(0, Math.floor((tokenData.expiresAt - Date.now()) / 1000))
    : 0;
  const timerPercent = (expiresIn / 5) * 100;

  const unmarkedCount = students.filter((s) => !s.status).length;
  const markedCount = students.length - unmarkedCount;

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-semibold text-slate-900">{courseName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {courseCode} — Live Session
        </p>
      </div>

      {!connected && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Connection lost — auto-reconnecting...
        </div>
      )}

      {/* QR Code + Roster Row */}
      <div className="flex flex-col lg:flex-row items-start gap-8 mb-8 w-full max-w-4xl">
        {/* QR Section */}
        <div className="flex flex-col items-center mx-auto lg:mx-0">
          <div className="relative mb-2">
            {qrDataUrl ? (
              <div className="rounded border border-slate-200 p-3 bg-white max-w-[286px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={qrImgRef}
                  src={qrDataUrl}
                  alt="Session QR Code"
                  className="block w-full h-auto max-w-[256px]"
                  width={256}
                  height={256}
                />
              </div>
            ) : (
              <div className="w-[220px] h-[220px] sm:w-[286px] sm:h-[286px] rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-navy-700 border-t-transparent animate-spin" />
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-navy-700 transition-all duration-500"
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-8 text-right">
                {expiresIn}s
              </span>
            </div>
          </div>

          {/* Print QR button */}
          {qrDataUrl && (
            <button
              onClick={handlePrintQR}
              className="mt-2 text-xs text-navy-600 hover:text-navy-800 underline transition-colors"
              title="Print QR code for classroom projection"
            >
              Print QR
            </button>
          )}

          {/* Mini counts below QR */}
          <div className="flex items-center gap-5 mt-3">
            {attendance ? (
              <>
                <div className="text-center">
                  <p className="text-xl font-semibold text-green-700">{attendance.present}</p>
                  <p className="text-xs text-slate-500">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-red-700">{attendance.absent}</p>
                  <p className="text-xs text-slate-500">Absent</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-slate-700">{attendance.total}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </>
            ) : (
              <div className="flex gap-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center">
                    <div className="w-10 h-7 rounded bg-slate-200 animate-pulse mx-auto" />
                    <div className="w-8 h-3 rounded bg-slate-100 animate-pulse mx-auto mt-1" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Student Roster */}
        <div className="flex-1 w-full lg:max-w-md">
          <button
            onClick={() => setShowRoster(!showRoster)}
            className="flex items-center justify-between w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>
              Student Roster
              <span className="ml-2 text-xs text-slate-400 font-normal">
                {markedCount}/{students.length} marked
                {unmarkedCount > 0 && (
                  <span className="ml-1 text-amber-600 font-medium">
                    ({unmarkedCount} pending)
                  </span>
                )}
              </span>
            </span>
            <svg
              className={`h-4 w-4 transition-transform ${showRoster ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showRoster && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white max-h-[400px] overflow-y-auto">
              {students.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  Loading students...
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const isMarked = !!student.status;
                    const isMarking = markingId === student.id;
                    return (
                      <div key={student.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {student.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {student.rollNo}
                          </p>
                        </div>
                        {isMarked ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              student.status === "PRESENT"
                                ? "bg-green-50 text-green-700"
                                : student.status === "LATE"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {student.status === "PRESENT"
                              ? "Present"
                              : student.status === "LATE"
                              ? "Late"
                              : "Absent"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleMarkStudent(student.id, "PRESENT")}
                              disabled={isMarking}
                              className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {isMarking ? "..." : "Present"}
                            </button>
                            <button
                              onClick={() => handleMarkStudent(student.id, "ABSENT")}
                              disabled={isMarking}
                              className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {isMarking ? "..." : "Absent"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 mb-4">{error}</p>
      )}

      {/* End Session */}
      {showConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">End this session?</span>
          <button
            onClick={handleEndSession}
            disabled={ending}
            className="rounded bg-red-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50 transition-colors"
          >
            {ending ? "Ending..." : "Confirm End"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded border border-red-300 px-4 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
        >
          End Session
        </button>
      )}
    </div>
  );
}
