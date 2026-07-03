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
          video: { facingMode: "environment" },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
      }

      if (!activeRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }

      streamRef.current = stream;

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          if (!activeRef.current) return;
          setErrorMessage("Camera access was lost.");
          setState("error");
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      await videoRef.current?.play();

      if (!activeRef.current) { cleanup(); return; }

      setState("scanning");
      stateRef.current = "scanning";

      intervalRef.current = window.setInterval(() => {
        if (stateRef.current !== "scanning" || !activeRef.current) return;
        scan();
      }, 500);
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

  function scan() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!video.videoWidth || !video.videoHeight) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      handleScan(code.data);
    }
  }

  async function handleScan(data: string) {
    if (!activeRef.current) return;
    stateRef.current = "success";
    clearInterval(intervalRef.current!);
    intervalRef.current = null;

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
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="w-full object-cover"
            playsInline
            muted
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative aspect-square w-3/4 max-w-[260px]">
              <div className="absolute inset-0 shadow-[0_0_0_999px_rgba(0,0,0,0.45)]" />
              <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-navy-400" />
              <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-navy-400" />
              <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-l-2 border-b-2 border-navy-400" />
              <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-r-2 border-b-2 border-navy-400" />
            </div>
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/60">
            Point camera at QR code
          </p>
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
