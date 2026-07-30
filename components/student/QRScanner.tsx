"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

type ScanState = "loading" | "scanning" | "success" | "error" | "no-camera";

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ScanState>("loading");
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const activeRef = useRef(true);

  const [state, setState] = useState<ScanState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [courseName, setCourseName] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(4);
  const [hasNativeZoom, setHasNativeZoom] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  function cleanup() {
    activeRef.current = false;
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function start() {
    if (!activeRef.current) return;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
      }

      if (!activeRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }

      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          if (!activeRef.current) return;
          setErrorMessage("Camera access was lost.");
          setState("error");
        };

        // Initialize focus and zoom capabilities if supported
        try {
          const capabilities = (track.getCapabilities?.() || {}) as any;
          if (capabilities.zoom) {
            setHasNativeZoom(true);
            setMinZoom(capabilities.zoom.min || 1);
            setMaxZoom(Math.min(capabilities.zoom.max || 4, 8));
          }
          if (capabilities.focusMode?.includes("continuous")) {
            track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] }).catch(() => {});
          }
        } catch {
          // ignore constraint errors
        }
      }

      if (!activeRef.current) { cleanup(); return; }

      setState("scanning");
      stateRef.current = "scanning";

      intervalRef.current = window.setInterval(() => {
        if (stateRef.current !== "scanning" || !activeRef.current) return;
        scan();
      }, 50);
    } catch (err: unknown) {
      if (!activeRef.current) return;
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setErrorMessage("Camera permission denied. Allow access in your browser settings.");
        setState("error");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setState("no-camera");
      } else {
        setErrorMessage("Camera not available.");
        setState("error");
      }
    }
  }

  function handleZoomChange(newZoom: number) {
    const clamped = Math.max(minZoom, Math.min(maxZoom, newZoom));
    setZoom(clamped);

    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities?.() || {}) as any;
        if (capabilities.zoom) {
          track.applyConstraints({ advanced: [{ zoom: clamped } as any] }).catch(() => {});
        }
      } catch {
        // Fallback to digital CSS & canvas zoom
      }
    }
  }

  function handleTapToFocus(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setFocusPoint(null), 1000);

    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities?.() || {}) as any;
        const advanced: any[] = [];
        if (capabilities.focusMode?.includes("single-shot")) {
          advanced.push({ focusMode: "single-shot", pointsOfInterest: [{ x, y }] });
        } else if (capabilities.focusMode?.includes("manual")) {
          advanced.push({ focusMode: "manual", pointsOfInterest: [{ x, y }] });
        } else if (capabilities.focusMode?.includes("continuous")) {
          advanced.push({ focusMode: "continuous" });
        }
        if (advanced.length > 0) {
          track.applyConstraints({ advanced }).catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }

  function scan() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!video.videoWidth || !video.videoHeight) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Downscale canvas to max 512px for instant 14x faster jsQR detection (like UPI scanners)
    const MAX_DIM = 512;
    let targetW = video.videoWidth;
    let targetH = video.videoHeight;
    if (targetW > MAX_DIM || targetH > MAX_DIM) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * MAX_DIM) / targetW);
        targetW = MAX_DIM;
      } else {
        targetW = Math.round((targetW * MAX_DIM) / targetH);
        targetH = MAX_DIM;
      }
    }

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    if (!hasNativeZoom && zoom > 1) {
      const cropW = video.videoWidth / zoom;
      const cropH = video.videoHeight / zoom;
      const cropX = (video.videoWidth - cropW) / 2;
      const cropY = (video.videoHeight - cropH) / 2;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, canvas.width, canvas.height);
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code?.data) {
      handleScan(code.data);
    }
  }

  async function handleScan(data: string) {
    if (!activeRef.current) return;
    stateRef.current = "success";
    clearInterval(intervalRef.current!);
    intervalRef.current = null;

    // Instant haptic feedback (vibration) like UPI apps
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch {
      // ignore
    }

    setErrorMessage("");
    setSuccessMessage("");
    setCourseName("");

    try {
      const res = await fetch("/api/student/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data }),
      });

      if (!activeRef.current) return;

      if (res.ok) {
        const result = await res.json();
        setCourseName(result.courseName || "");
        setSuccessMessage("Attendance marked!");
        setState("success");
        timeoutRef.current = window.setTimeout(() => {
          if (!activeRef.current) return;
          stateRef.current = "loading";
          start();
        }, 3000);
      } else if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      } else if (res.status === 409) {
        setErrorMessage("Already marked for this session.");
        setState("error");
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error || "Invalid or expired QR code.");
        setState("error");
      }
    } catch {
      if (!activeRef.current) return;
      setErrorMessage("Network error. Try again.");
      setState("error");
    }
  }

  useEffect(() => {
    if (state === "scanning" && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        video.play().catch(() => {});
      };
      video.play().catch(() => {});
    }
  }, [state]);

  useEffect(() => {
    activeRef.current = true;
    stateRef.current = "loading";
    start();
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  function handleRetry() {
    cleanup();
    setState("loading");
    stateRef.current = "loading";
    setErrorMessage("");
    setSuccessMessage("");
    setCourseName("");
    setZoom(1);
    setRetryKey((k) => k + 1);
  }

  return (
    <div className="w-full max-w-sm">
      <canvas ref={canvasRef} className="hidden" />

      {state === "loading" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-6 py-20">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-navy-500 border-t-transparent" />
          <p className="text-sm text-slate-600">Requesting camera access...</p>
        </div>
      )}

      {state === "scanning" && (
        <div className="flex flex-col gap-3">
          <div
            onClick={handleTapToFocus}
            className="relative overflow-hidden rounded-lg bg-black min-h-[280px] flex items-center justify-center cursor-pointer select-none"
          >
            <video
              ref={videoRef}
              className="w-full h-full min-h-[280px] object-cover transition-transform duration-200"
              style={{
                transform: !hasNativeZoom && zoom > 1 ? `scale(${zoom})` : "none",
              }}
              autoPlay
              playsInline
              muted
            />

            {/* Tap Focus Ring Animation */}
            {focusPoint && (
              <div
                className="pointer-events-none absolute h-12 w-12 rounded-full border-2 border-yellow-400 animate-ping -translate-x-1/2 -translate-y-1/2"
                style={{ left: focusPoint.x, top: focusPoint.y }}
              />
            )}

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative aspect-square w-3/4 max-w-[260px]">
                <div className="absolute inset-0 shadow-[0_0_0_999px_rgba(0,0,0,0.45)]" />
                <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-navy-400" />
                <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-navy-400" />
                <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-l-2 border-b-2 border-navy-400" />
                <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-r-2 border-b-2 border-navy-400" />
              </div>
            </div>

            <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/80 font-medium drop-shadow">
              Tap screen to focus • Point at QR code
            </p>
          </div>

          {/* Zoom Controls */}
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Zoom</span>
              <span className="text-navy-600 font-semibold">{zoom.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={minZoom}
                max={maxZoom}
                step={0.1}
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-navy-600"
              />
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 1.5, 2, 3].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => handleZoomChange(z)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    Math.abs(zoom - z) < 0.1
                      ? "bg-navy-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {z}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {state === "success" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-green-200 bg-green-50 px-6 py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-7 w-7 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-green-800">
            {successMessage}
          </p>
          {courseName && (
            <p className="mt-1 text-sm text-green-600">{courseName}</p>
          )}
          <p className="mt-4 text-xs text-green-500">Returning to scanner...</p>
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-6 py-12">
          <p className="mb-5 text-sm text-red-700">{errorMessage}</p>
          <button
            onClick={handleRetry}
            className="rounded-lg bg-navy-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-700"
          >
            Try Again
          </button>
        </div>
      )}

      {state === "no-camera" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-6 py-12">
          <p className="mb-2 text-sm text-slate-700">No camera detected.</p>
          <p className="text-center text-xs text-slate-500">
            Please ask your faculty to mark your attendance manually.
          </p>
        </div>
      )}
    </div>
  );
}
