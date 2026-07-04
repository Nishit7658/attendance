"use client";

import { useEffect, useState } from "react";
import { Banner } from "@/components/ui/Banner";

interface SettingField {
  key: string;
  label: string;
  description: string;
  type: "number" | "text" | "boolean";
}

const SETTING_FIELDS: SettingField[] = [
  {
    key: "slots_per_day",
    label: "Slots Per Day",
    description: "Number of time slots per day (default: 6)",
    type: "number",
  },
  {
    key: "min_attendance_percentage",
    label: "Minimum Attendance %",
    description: "Minimum attendance percentage before a student is marked at risk (default: 75)",
    type: "number",
  },
  {
    key: "qr_refresh_interval",
    label: "QR Refresh Interval (seconds)",
    description: "How often the QR code rotates during a live session (default: 3)",
    type: "number",
  },
  {
    key: "lan_restriction_enabled",
    label: "LAN Restriction",
    description: "Restrict access to local network only (requires configuration)",
    type: "boolean",
  },
  {
    key: "lan_allowed_ips",
    label: "LAN Allowed IPs",
    description: "Comma-separated list of allowed IPs/ranges (if LAN restriction is enabled)",
    type: "text",
  },
  {
    key: "academic_year",
    label: "Academic Year",
    description: "Current academic year (e.g., 2026)",
    type: "text",
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(key: string, value: string) {
    setSaving(key);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSettings((prev) => ({ ...prev, [key]: value }));
      setSuccess(`"${key}" updated successfully.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-navy-900">System Settings</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-2 h-5 w-40 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-64 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-navy-900">System Settings</h1>

      {error && (
        <Banner variant="error" className="mb-4">
          {error}
        </Banner>
      )}
      {success && (
        <Banner variant="success" className="mb-4">
          {success}
        </Banner>
      )}

      <div className="space-y-4">
        {SETTING_FIELDS.map((field) => {
          const currentValue = settings[field.key] ?? "";
          const isSaving = saving === field.key;

          return (
            <div key={field.key} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label
                    htmlFor={`setting-${field.key}`}
                    className="text-sm font-semibold text-slate-900"
                  >
                    {field.label}
                  </label>
                  <p className="mt-0.5 text-xs text-slate-500">{field.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {field.type === "boolean" ? (
                    <button
                      id={`setting-${field.key}`}
                      onClick={() =>
                        handleSave(field.key, currentValue === "true" ? "false" : "true")
                      }
                      disabled={!!isSaving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        currentValue === "true" ? "bg-navy-700" : "bg-slate-300"
                      }`}
                      aria-label={field.label}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          currentValue === "true" ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        id={`setting-${field.key}`}
                        type={field.type}
                        defaultValue={currentValue}
                        className="w-24 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-navy-700 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSave(field.key, (e.target as HTMLInputElement).value);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById(`setting-${field.key}`) as HTMLInputElement;
                          if (input) handleSave(field.key, input.value);
                        }}
                        disabled={isSaving}
                        className="rounded bg-navy-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-xs text-slate-500">
          <strong>Note:</strong> Some settings (like LAN restriction) may require server-level
          configuration changes outside of this UI. These settings are read by the application
          at runtime.
        </p>
      </div>
    </div>
  );
}
