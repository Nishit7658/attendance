"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, Maximize, Minimize } from "lucide-react";

interface FullPageQRClientProps {
  sessionId: string;
  courseName: string;
  courseCode: string;
}

interface TokenData {
  token: string;
  expiresAt: number;
}

export default function FullPageQRClient({
  sessionId,
}: FullPageQRClientProps) {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isNativeFull, setIsNativeFull] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const mountedRef = useRef(true);

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
    };

    es.addEventListener("token", (e) => {
      try {
        const data: TokenData = JSON.parse(e.data);
        QRCode.toDataURL(data.token, {
          width: 1024,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        }).then((url) => {
          if (mountedRef.current) setQrDataUrl(url);
        });
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
      es.close();
      const attempt = reconnectAttemptRef.current;
      if (attempt >= 10) return;
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };
  }, [sessionId, router]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    const handleFSChange = () => {
      setIsNativeFull(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("fullscreenchange", handleFSChange);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      eventSourceRef.current?.close();
    };
  }, [connect]);

  function toggleNativeFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 select-none">
      {/* Top Bar Navigation */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white/70">
        <button
          onClick={() => router.push(`/faculty/sessions/${sessionId}/live`)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Live Session
        </button>

        <button
          onClick={toggleNativeFullscreen}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur transition-colors"
        >
          {isNativeFull ? (
            <>
              <Minimize className="w-4 h-4" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize className="w-4 h-4" />
              Toggle Fullscreen
            </>
          )}
        </button>
      </div>

      {/* Main Full Page QR Code */}
      {qrDataUrl ? (
        <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-2xl flex items-center justify-center max-w-[92vw] max-h-[85vh] aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Full Page QR Code"
            className="w-full h-full max-w-[80vh] max-h-[80vh] object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <p className="text-white/60 text-sm font-medium">Generating QR Code...</p>
        </div>
      )}
    </div>
  );
}
