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

export default function LiveSessionClient({
  sessionId,
  courseName,
  courseCode,
}: LiveSessionClientProps) {
  const router = useRouter();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [connected, setConnected] = useState(true);
  const [ending, setEnding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const es = new EventSource(`/api/faculty/sessions/${sessionId}/events`);
    eventSourceRef.current = es;

    es.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnected(true);
    };

    es.addEventListener("token", (e) => {
      try {
        const data: TokenData = JSON.parse(e.data);
        setTokenData(data);
        lastTokenRef.current = data.token;
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
  }, [sessionId, router]);

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

  const expiresIn = tokenData
    ? Math.max(0, Math.floor((tokenData.expiresAt - Date.now()) / 1000))
    : 0;
  const timerPercent = (expiresIn / 5) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="text-center mb-8">
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

      <div className="relative mb-6">
        {qrDataUrl ? (
          <div className="rounded border border-slate-200 p-3 bg-white max-w-[286px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
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

      <div className="flex items-center gap-6 mb-8">
        {attendance ? (
          <>
            <div className="text-center">
              <p className="text-2xl font-semibold text-green-700">
                {attendance.present}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Present</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-red-700">
                {attendance.absent}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Absent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-slate-700">
                {attendance.total}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Total</p>
            </div>
          </>
        ) : (
          <div className="flex gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-8 rounded bg-slate-200 animate-pulse mx-auto" />
                <div className="w-10 h-3 rounded bg-slate-100 animate-pulse mx-auto mt-1" />
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-4">{error}</p>
      )}

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
