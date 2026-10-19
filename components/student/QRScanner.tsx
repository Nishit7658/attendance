"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

type ScanState = "loading" | "scanning" | "success" | "error" | "no-camera";

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect: (image: ImageBitmapSource) => Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  focusMode?: "none" | "manual" | "single-shot" | "continuous";
  exposureMode?: "none" | "manual" | "single-shot" | "continuous";
  pointsOfInterest?: Array<{ x: number; y: number }>;
  zoom?: number;
}

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  focusMode?: string[];
  exposureMode?: string[];
  zoom?: {
    min?: number;
    max?: number;
    step?: number;
  };
}

interface ScanSuccessResponse {
  courseName?: string;
  error?: string;
}

const ROI_RATIO = 0.6;
const SCAN_CANVAS_SIZE = 400;

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ScanState>("loading");
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const activeRef = useRef<boolean>(true);
  const isProcessingRef = useRef<boolean>(false);
  const barcodeDetectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const barcodeDetectorCheckedRef = useRef<boolean>(false);
  const zoomRef = useRef<number>(1);
  const hasNativeZoomRef = useRef<boolean>(false);

  const [state, setState] = useState<ScanState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [courseName, setCourseName] = useState<string>("");
  const [retryKey, setRetryKey] = useState<number>(0);

  const [zoom, setZoom] = useState<number>(1);
  const [minZoom, setMinZoom] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(4);
  const [hasNativeZoom, setHasNativeZoom] = useState<boolean>(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  function getBarcodeDetector(): BarcodeDetectorInstance | null {
    if (barcodeDetectorCheckedRef.current) {
      return barcodeDetectorRef.current;
    }
    barcodeDetectorCheckedRef.current = true;

    if (typeof window !== "undefined" && window.BarcodeDetector) {
      try {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ["qr_code"],
        });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }
    return barcodeDetectorRef.current;
  }

  function stopScanLoop() {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    isProcessingRef.current = false;
  }

  function cleanup() {
    activeRef.current = false;
    stopScanLoop();

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function startScanLoop() {
    stopScanLoop();

    const tick = () => {
      if (!activeRef.current || stateRef.current !== "scanning") return;

      if (!isProcessingRef.current) {
        void scanFrame();
      }

      if (activeRef.current && stateRef.current === "scanning") {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }

  async function start() {
    if (!activeRef.current) return;

    stopScanLoop();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
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
          setErrorMessage("Camera access was lost.");
          setState("error");
          stateRef.current = "error";
        };

        // Apply continuous autofocus & exposure so camera never hunts on digital projector screens
        const continuousConstraints: ExtendedMediaTrackConstraintSet[] = [
          { focusMode: "continuous" },
          { exposureMode: "continuous" },
        ];
        track
          .applyConstraints({
            advanced: continuousConstraints,
          })
          .catch(() => {});

        try {
          const capabilities = (track.getCapabilities?.() ??
            {}) as ExtendedMediaTrackCapabilities;

          if (capabilities.zoom) {
            setHasNativeZoom(true);
            hasNativeZoomRef.current = true;
            setMinZoom(capabilities.zoom.min ?? 1);
            setMaxZoom(Math.min(capabilities.zoom.max ?? 4, 8));
          } else {
            setHasNativeZoom(false);
            hasNativeZoomRef.current = false;
          }
        } catch {
          // Ignore capability inspection errors on unsupported browsers
        }
      }

      if (!activeRef.current) {
        cleanup();
        return;
      }

      setState("scanning");
      stateRef.current = "scanning";
      startScanLoop();
    } catch (err: unknown) {
      if (!activeRef.current) return;
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setErrorMessage("Camera permission denied. Allow access in your browser settings.");
        setState("error");
        stateRef.current = "error";
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setState("no-camera");
        stateRef.current = "no-camera";
      } else {
        setErrorMessage("Camera not available.");
        setState("error");
        stateRef.current = "error";
      }
    }
  }

  function handleZoomChange(newZoom: number) {
    const clamped = Math.max(minZoom, Math.min(maxZoom, newZoom));
    setZoom(clamped);
    zoomRef.current = clamped;

    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities?.() ??
          {}) as ExtendedMediaTrackCapabilities;
        if (capabilities.zoom) {
          const zoomConstraint: ExtendedMediaTrackConstraintSet = { zoom: clamped };
          track.applyConstraints({ advanced: [zoomConstraint] }).catch(() => {});
        }
      } catch {
        // Fallback to digital CSS & ROI canvas zoom
      }
    }
  }

  function handleTapToFocus(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    window.setTimeout(() => setFocusPoint(null), 1000);

    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities?.() ??
          {}) as ExtendedMediaTrackCapabilities;
        const advanced: ExtendedMediaTrackConstraintSet[] = [];
        const focusModes = Array.isArray(capabilities.focusMode)
          ? capabilities.focusMode
          : [];

        if (focusModes.includes("single-shot")) {
          advanced.push({
            focusMode: "single-shot",
            pointsOfInterest: [{ x, y }],
          });
        } else if (focusModes.includes("manual")) {
          advanced.push({
            focusMode: "manual",
            pointsOfInterest: [{ x, y }],
          });
        }
        advanced.push({ focusMode: "continuous" }, { exposureMode: "continuous" });

        track.applyConstraints({ advanced }).catch(() => {});
      } catch {
        // Ignore unsupported focus constraints
      }
    }
  }

  async function scanFrame() {
    if (isProcessingRef.current || !activeRef.current || stateRef.current !== "scanning") {
      return;
    }
    isProcessingRef.current = true;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return;

      // 1. Primary Decoder: Hardware-accelerated native BarcodeDetector (<10ms on GPU)
      const detector = getBarcodeDetector();
      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0 && barcodes[0]?.rawValue) {
            void handleScan(barcodes[0].rawValue);
            return;
          }
        } catch {
          // Fall through to secondary cropped ROI jsQR fallback
        }
      }

      // 2. Secondary Fallback: Center 60% ROI cropped to 400x400 canvas for jsQR
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      if (canvas.width !== SCAN_CANVAS_SIZE || canvas.height !== SCAN_CANVAS_SIZE) {
        canvas.width = SCAN_CANVAS_SIZE;
        canvas.height = SCAN_CANVAS_SIZE;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const effectiveZoom =
        !hasNativeZoomRef.current && zoomRef.current > 1 ? zoomRef.current : 1;

      // Crop to center 60% bounding box (where the target reticle sits), adjusted for digital zoom
      const baseRoiWidth = vw * ROI_RATIO;
      const baseRoiHeight = vh * ROI_RATIO;
      const cropW = Math.max(1, Math.round(baseRoiWidth / effectiveZoom));
      const cropH = Math.max(1, Math.round(baseRoiHeight / effectiveZoom));
      const cropX = Math.round((vw - cropW) / 2);
      const cropY = Math.round((vh - cropH) / 2);

      ctx.drawImage(
        video,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        SCAN_CANVAS_SIZE,
        SCAN_CANVAS_SIZE
      );

      const imageData = ctx.getImageData(0, 0, SCAN_CANVAS_SIZE, SCAN_CANVAS_SIZE);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code?.data) {
        void handleScan(code.data);
      }
    } finally {
      isProcessingRef.current = false;
    }
  }

  async function handleScan(data: string) {
    if (!activeRef.current || stateRef.current !== "scanning") return;
    stateRef.current = "success";
    stopScanLoop();

    // Instant haptic feedback on detection
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch {
      // Ignore vibration errors
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
        const result = (await res.json()) as ScanSuccessResponse;
        setCourseName(result.courseName ?? "");
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
        stateRef.current = "error";
      } else {
        const body = (await res.json().catch(() => ({}))) as ScanSuccessResponse;
        setErrorMessage(body.error ?? "Invalid or expired QR code.");
        setState("error");
        stateRef.current = "error";
      }
    } catch {
      if (!activeRef.current) return;
      setErrorMessage("Network error. Try again.");
      setState("error");
      stateRef.current = "error";
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
    setZoom(1);
    zoomRef.current = 1;
    setRetryKey((k) => k + 1);
  }

  return (
    <div className="w-full max-w-sm">
      <canvas
        ref={canvasRef}
        width={SCAN_CANVAS_SIZE}
        height={SCAN_CANVAS_SIZE}
        className="hidden"
      />

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
              <div className="relative aspect-square w-3/5 max-w-[240px]">
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