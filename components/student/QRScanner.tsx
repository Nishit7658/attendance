"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

type ScanState = "loading" | "scanning" | "success" | "error" | "no-camera";

/* ── Browser-native BarcodeDetector typings (not yet in lib.dom) ── */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

/* ── Non-standard camera constraints (focus / exposure / zoom) ── */
interface AdvancedCameraConstraint {
  focusMode?: string;
  exposureMode?: string;
  zoom?: number;
  pointsOfInterest?: { x: number; y: number }[];
}
interface CameraCapabilities {
  zoom?: { min?: number; max?: number };
  focusMode?: string[];
  exposureMode?: string[];
}

/** Fraction of the frame (per axis) that is decoded – matches the on-screen reticle. */
const ROI_FRACTION = 0.6;
/** Longest side of the canvas handed to jsQR. */
const ROI_MAX_PX = 400;

function applyAdvanced(
  track: MediaStreamTrack,
  advanced: AdvancedCameraConstraint[]
): void {
  track
    .applyConstraints({ advanced } as unknown as MediaTrackConstraints)
    .catch(() => {
      // Unsupported constraint – ignore.
    });
}

function readCapabilities(track: MediaStreamTrack): CameraCapabilities {
  try {
    return (track.getCapabilities?.() ?? {}) as unknown as CameraCapabilities;
  } catch {
    return {};
  }
}

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ScanState>("loading");
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const activeRef = useRef(true);
  const isProcessingRef = useRef(false);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const zoomRef = useRef(1);
  const nativeZoomRef = useRef(false);

  const [state, setState] = useState<ScanState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [courseName, setCourseName] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(4);
  const [hasNativeZoom, setHasNativeZoom] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  function stopLoop() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function cleanup() {
    activeRef.current = false;
    stopLoop();
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (focusTimeoutRef.current !== null) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    isProcessingRef.current = false;
  }

  /** Create the hardware-accelerated detector once (if the browser supports QR). */
  async function initDetector(): Promise<void> {
    detectorRef.current = null;
    if (typeof window === "undefined") return;
    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector;
    if (!Ctor) return;
    try {
      if (Ctor.getSupportedFormats) {
        const formats = await Ctor.getSupportedFormats();
        if (!formats.includes("qr_code")) return;
      }
      detectorRef.current = new Ctor({ formats: ["qr_code"] });
    } catch {
      detectorRef.current = null;
    }
  }

  async function start() {
    if (!activeRef.current) return;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const detectorReady = initDetector();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
      }

      if (!activeRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          if (!activeRef.current) return;
          stopLoop();
          setErrorMessage("Camera access was lost.");
          setState("error");
        };

        const caps = readCapabilities(track);
        if (caps.zoom) {
          nativeZoomRef.current = true;
          setHasNativeZoom(true);
          setMinZoom(caps.zoom.min ?? 1);
          setMaxZoom(Math.min(caps.zoom.max ?? 4, 8));
        } else {
          nativeZoomRef.current = false;
          setHasNativeZoom(false);
        }

        // Continuous autofocus + exposure so the camera doesn't hunt on a screen.
        const advanced: AdvancedCameraConstraint[] = [];
        if (!caps.focusMode || caps.focusMode.includes("continuous")) {
          advanced.push({ focusMode: "continuous" });
        }
        if (!caps.exposureMode || caps.exposureMode.includes("continuous")) {
          advanced.push({ exposureMode: "continuous" });
        }
        if (advanced.length > 0) applyAdvanced(track, advanced);
      }

      await detectorReady;
      if (!activeRef.current) {
        cleanup();
        return;
      }

      stateRef.current = "scanning";
      setState("scanning");
      startLoop();
    } catch (err: unknown) {
      if (!activeRef.current) return;
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setErrorMessage(
          "Camera permission denied. Allow access in your browser settings."
        );
        setState("error");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setState("no-camera");
      } else {
        setErrorMessage("Camera not available.");
        setState("error");
      }
    }
  }

  /** requestAnimationFrame loop – at most one decode in flight at any time. */
  function startLoop() {
    stopLoop();
    const frame = () => {
      if (!activeRef.current || stateRef.current !== "scanning") {
        rafRef.current = null;
        return;
      }
      if (!isProcessingRef.current) {
        isProcessingRef.current = true;
        void scan().finally(() => {
          isProcessingRef.current = false;
        });
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }

  function handleZoomChange(newZoom: number) {
    const clamped = Math.max(minZoom, Math.min(maxZoom, newZoom));
    zoomRef.current = clamped;
    setZoom(clamped);

    const track = streamRef.current?.getVideoTracks()[0];
    if (track && nativeZoomRef.current) {
      applyAdvanced(track, [{ zoom: clamped }]);
    }
  }

  function handleTapToFocus(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (focusTimeoutRef.current !== null) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = window.setTimeout(() => setFocusPoint(null), 1000);

    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const caps = readCapabilities(track);
    const modes = caps.focusMode ?? [];
    if (modes.includes("single-shot")) {
      applyAdvanced(track, [
        { focusMode: "single-shot", pointsOfInterest: [{ x, y }] },
      ]);
    } else if (modes.includes("manual")) {
      applyAdvanced(track, [
        { focusMode: "manual", pointsOfInterest: [{ x, y }] },
      ]);
    } else if (modes.includes("continuous")) {
      applyAdvanced(track, [{ focusMode: "continuous" }]);
    }
  }

  async function scan(): Promise<void> {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return;

    const digitalZoom = !nativeZoomRef.current ? zoomRef.current : 1;

    // Region of interest: centre 60% of the frame (tighter when digitally zoomed).
    const roiW = (video.videoWidth * ROI_FRACTION) / digitalZoom;
    const roiH = (video.videoHeight * ROI_FRACTION) / digitalZoom;
    const roiX = (video.videoWidth - roiW) / 2;
    const roiY = (video.videoHeight - roiH) / 2;

    // Output size: longest side capped at ROI_MAX_PX.
    const scale = Math.min(1, ROI_MAX_PX / Math.max(roiW, roiH));
    const outW = Math.max(1, Math.round(roiW * scale));
    const outH = Math.max(1, Math.round(roiH * scale));
    if (canvas.width !== outW || canvas.height !== outH) {
      canvas.width = outW;
      canvas.height = outH;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, outW, outH);

    // Primary: hardware-accelerated BarcodeDetector.
    const detector = detectorRef.current;
    if (detector) {
      try {
        const codes = await detector.detect(canvas);
        if (codes.length > 0 && codes[0].rawValue) {
          void handleScan(codes[0].rawValue);
          return;
        }
        return;
      } catch {
        // Detector failed at runtime – permanently fall back to jsQR.
        detectorRef.current = null;
      }
    }

    // Fallback: jsQR on the small ROI canvas.
    const imageData = ctx.getImageData(0, 0, outW, outH);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code?.data) {
      void handleScan(code.data);
    }
  }

  async function handleScan(data: string) {
    if (!activeRef.current || stateRef.current !== "scanning") return;
    stateRef.current = "success";
    stopLoop();

    // Instant haptic feedback
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
        const result = (await res.json()) as { courseName?: string };
        setCourseName(result.courseName || "");
        setSuccessMessage("Attendance marked!");
        setState("success");
        timeoutRef.current = window.setTimeout(() => {
          if (!activeRef.current) return;
          stateRef.current = "loading";
          void start();
        }, 3000);
      } else if (res.status === 401) {
        window.location.href = "/login";
        return;
      } else if (res.status === 409) {
        setErrorMessage("Already marked for this session.");
        setState("error");
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
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
    void start();
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
    zoomRef.current = 1;
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-green-800">{successMessage}</p>
          {courseName && <p className="mt-1 text-sm text-green-600">{courseName}</p>}
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
