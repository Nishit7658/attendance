"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Maximize2, X } from "lucide-react";

interface LiveSessionClientProps {
  sessionId: string;
  courseName: string;
  courseCode: string;
}

interface TokenData {
  token: string;
  expiresAt: number;
}


interface StudentStatus {
  id: string;
  name: string;
  rollNo: string;
  status: string | null;
  isFlagged?: boolean;
  flagReason?: string | null;
}

type MarkStatus = "PRESENT" | "ABSENT" | "LATE";

export default function LiveSessionClient({
  sessionId,
  courseName,
  courseCode,
}: LiveSessionClientProps) {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [students, setStudents] = useState<StudentStatus[] | null>(null);
  const [connected, setConnected] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  
  // End session modal state
  const [showEndModal, setShowEndModal] = useState(false);
  const [unmarkedCount, setUnmarkedCount] = useState<number | null>(null);
  const [isAdHoc, setIsAdHoc] = useState(false);
  const [autoMarkAbsent, setAutoMarkAbsent] = useState(true);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [nextRefresh, setNextRefresh] = useState<number | null>(null);
  const [rosterFilter, setRosterFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "UNMARKED">("ALL");
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
      // silently fail
    }
  }, [sessionId]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(`/api/faculty/sessions/${sessionId}/events`);
    eventSourceRef.current = es;

    es.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnected(true);
      fetchStudents();
    };

    es.addEventListener("token", (e) => {
      try {
        const data: TokenData = JSON.parse(e.data);
        setNextRefresh(Date.now() + 5000);
        QRCode.toDataURL(data.token, {
          width: 512,
          margin: 1,
          color: { dark: "#1e293b", light: "#ffffff" },
        }).then(setQrDataUrl);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("attendance", () => {
      try {
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

    const timer = setInterval(() => {
      if (mountedRef.current) setNow(Date.now());
    }, 100);

    const rosterPoller = setInterval(() => {
      if (mountedRef.current) fetchStudents();
    }, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
      clearInterval(rosterPoller);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      eventSourceRef.current?.close();
    };
  }, [connect, fetchStudents]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullScreen(false);
      }
    };

    if (isFullScreen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullScreen]);

  const handleOpenEndModal = useCallback(async () => {
    setShowEndModal(true);
    setLoadingModalData(true);
    try {
      const res = await fetch(`/api/faculty/sessions/${sessionId}/unmarked-count`);
      const data = await res.json();
      if (res.ok) {
        setUnmarkedCount(data.count);
        setIsAdHoc(data.isAdHoc);
        setAutoMarkAbsent(!data.isAdHoc); // default true for scheduled, false for ad-hoc
      }
    } catch {
      // ignore
    } finally {
      setLoadingModalData(false);
    }
  }, [sessionId]);

  const handleEndSession = useCallback(async () => {
    setEnding(true);
    setError(null);
    try {
      const res = await fetch(`/api/faculty/sessions/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoMarkAbsent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to end session");
      router.push(data.redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setEnding(false);
      setShowEndModal(false);
    }
  }, [sessionId, router, autoMarkAbsent]);

  const handleMarkStudent = useCallback(
    async (studentId: string, status: MarkStatus) => {
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
        setStudents((prev) =>
          prev
            ? prev.map((s) => (s.id === studentId ? { ...s, status } : s))
            : prev
        );
        await fetchStudents();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setMarkingId(null);
      }
    },
    [sessionId, fetchStudents]
  );

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

  const refreshMsLeft = nextRefresh ? Math.max(0, nextRefresh - now) : 0;
  const refreshSecs = Math.ceil(refreshMsLeft / 1000);
  const timerPercent = (refreshMsLeft / 5000) * 100;

  const presentCount = students?.filter((s) => s.status === "PRESENT").length ?? 0;
  const absentCount = students?.filter((s) => s.status === "ABSENT").length ?? 0;
  const unmarkedRosterCount = students?.filter((s) => s.status === null).length ?? 0;
  const totalCount = students?.length ?? 0;

  const filteredStudents = students?.filter((s) => {
    if (rosterFilter === "ALL") return true;
    if (rosterFilter === "PRESENT") return s.status === "PRESENT";
    if (rosterFilter === "ABSENT") return s.status === "ABSENT";
    if (rosterFilter === "UNMARKED") return s.status === null;
    return true;
  }) ?? null;

  const FILTER_TABS: { label: string; value: "ALL" | "PRESENT" | "ABSENT" | "UNMARKED"; count: number | null }[] = [
    { label: "All", value: "ALL", count: totalCount },
    { label: "Present", value: "PRESENT", count: presentCount },
    { label: "Absent", value: "ABSENT", count: students ? absentCount - unmarkedRosterCount : null },
    { label: "Unmarked", value: "UNMARKED", count: unmarkedRosterCount },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-semibold text-ink">{courseName}</h1>
        <p className="text-sm text-muted mt-0.5">
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
              <a
                href={`/faculty/sessions/${sessionId}/qr`}
                target="_blank"
                rel="noreferrer"
                className="group relative block rounded-lg border border-slate-200 p-3 bg-white max-w-[286px] cursor-pointer hover:border-slate-400 hover:ring-2 hover:ring-slate-400/20 hover:shadow-md transition-all duration-200"
                title="Click to open full page QR view in new tab"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={qrImgRef}
                  src={qrDataUrl}
                  alt="Session QR Code (Click for Full Page)"
                  className="block w-full h-auto max-w-[256px]"
                  width={256}
                  height={256}
                />
                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center text-white text-xs font-medium gap-2 p-2 backdrop-blur-[1px]">
                  <Maximize2 className="w-6 h-6 text-white" />
                  <span>Click for Full Page QR</span>
                </div>
              </a>
            ) : (
              <div className="w-[220px] h-[220px] sm:w-[286px] sm:h-[286px] rounded border border-border bg-surface flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-100 ease-linear"
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted w-8 text-right">
                {refreshSecs}s
              </span>
            </div>
          </div>

          {/* QR Action buttons */}
          {qrDataUrl && (
            <div className="mt-1 flex items-center gap-3">
              <a
                href={`/faculty/sessions/${sessionId}/qr`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-navy-600 hover:text-navy-800 font-medium inline-flex items-center gap-1 transition-colors"
                title="Open full page view for classroom projection"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Full Page QR
              </a>
              <span className="text-slate-300">•</span>
              <button
                onClick={handlePrintQR}
                className="text-xs text-navy-600 hover:text-navy-800 underline transition-colors"
                title="Print QR code for classroom projection"
              >
                Print QR
              </button>
            </div>
          )}

          {/* Counts below QR */}
          <div className="flex items-center gap-5 mt-3">
            <div className="text-center">
              <p className="text-xl font-semibold text-green-500">{presentCount}</p>
              <p className="text-xs text-muted">Present</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-red-500">{absentCount}</p>
              <p className="text-xs text-muted">Absent</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-ink">{totalCount}</p>
              <p className="text-xs text-muted">Total</p>
            </div>
          </div>
        </div>

        {/* Student Roster */}
        <div className="flex-1 w-full lg:max-w-md">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
            {/* Roster Header + Filters */}
            <div className="border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm font-semibold text-slate-800">Student Roster</span>
                <span className="text-xs text-slate-500 font-medium">{presentCount}/{totalCount} Present</span>
              </div>
              {/* Filter tabs */}
              <div className="flex border-t border-slate-100">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setRosterFilter(tab.value)}
                    className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                      rosterFilter === tab.value
                        ? "bg-white text-primary border-b-2 border-primary"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                    {tab.count !== null && tab.count > 0 && (
                      <span className="ml-1 text-[10px] opacity-70">({tab.count})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Roster List */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
              {filteredStudents === null ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
                  Loading students...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  {rosterFilter === "ALL" ? "No students found." : `No ${rosterFilter.toLowerCase()} students.`}
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isMarking = markingId === student.id;
                  const status = student.status;

                  return (
                    <div key={student.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {student.name}
                          </p>
                          {student.isFlagged && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded cursor-help"
                              title={student.flagReason || "Proxy scan detected"}
                            >
                              ⚠️ Proxy Alert
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {student.rollNo} {student.isFlagged && student.flagReason ? `• ${student.flagReason}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Present button — highlight if already present */}
                        <button
                          onClick={() => handleMarkStudent(student.id, "PRESENT")}
                          disabled={isMarking}
                          className={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                            status === "PRESENT"
                              ? "bg-green-600 text-white ring-2 ring-green-400"
                              : "bg-green-50 text-green-700 border border-green-300 hover:bg-green-100"
                          }`}
                          title="Mark Present"
                        >
                          {isMarking ? "..." : "Present"}
                        </button>

                        {/* Absent button — highlight if already absent */}
                        <button
                          onClick={() => handleMarkStudent(student.id, "ABSENT")}
                          disabled={isMarking}
                          className={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                            status === "ABSENT"
                              ? "bg-red-600 text-white ring-2 ring-red-400"
                              : "bg-red-50 text-red-700 border border-red-300 hover:bg-red-100"
                          }`}
                          title="Mark Absent"
                        >
                          {isMarking ? "..." : "Absent"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 mb-4">{error}</p>
      )}

      {/* End Session Button */}
      <button
        onClick={handleOpenEndModal}
        className="rounded border border-red-300 px-4 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
      >
        End Session
      </button>

      {/* End Session Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-slate-900">End Session</h3>
            <p className="mb-4 text-sm text-slate-600">
              Are you sure you want to end this session? The QR code will stop working.
            </p>

            {loadingModalData ? (
              <div className="mb-4 text-sm text-slate-500 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Checking unmarked students...
              </div>
            ) : (
              <div className="mb-5 rounded border border-slate-200 bg-slate-50 p-3">
                <label className={`flex items-start gap-3 ${isAdHoc ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={autoMarkAbsent}
                    onChange={(e) => setAutoMarkAbsent(e.target.checked)}
                    disabled={isAdHoc}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Auto-mark unmarked as ABSENT
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isAdHoc 
                        ? "Not available for ad-hoc sessions" 
                        : `Will mark ${unmarkedCount ?? 0} unmarked students as ABSENT.`}
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                disabled={ending}
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                disabled={ending || loadingModalData}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {ending ? "Ending..." : "End Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen QR Modal Overlay - ONLY QR CODE */}
      {isFullScreen && qrDataUrl && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setIsFullScreen(false)}
        >
          {/* Subtle floating close button in top right */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullScreen(false);
            }}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Clean Big QR Code */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-2xl flex items-center justify-center max-w-[92vw] max-h-[92vh] aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Session QR Code Full Page"
              className="w-full h-full max-w-[85vh] max-h-[85vh] object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
