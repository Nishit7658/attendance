"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SessionCardProps {
  id: string;
  courseCode: string;
  courseName: string;
  startTime: string;
  endTime: string;
  room: string;
  section: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SessionCard({
  id,
  courseCode,
  courseName,
  startTime,
  endTime,
  room,
  section,
}: SessionCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/faculty/sessions/${id}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start session");
      router.push(data.redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 border-b border-border py-3 px-4 hover:bg-surface-hover transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-ink">
            {courseCode}
          </span>
          <span className="text-sm text-muted">{courseName}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
          <span>
            {formatTime(startTime)} – {formatTime(endTime)}
          </span>
          <span>Room {room}</span>
          <span>Sec {section}</span>
        </div>
      </div>
      <div className="shrink-0">
        <button
          onClick={handleStart}
          disabled={loading}
          className="btn-primary px-4 py-1.5 text-xs"
        >
          {loading ? "Starting..." : "Start Session"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
