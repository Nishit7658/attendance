// lib/device-id.ts
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "server-side-no-device-id";
  }

  const STORAGE_KEY = "puff_device_id";
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    // Generate a simple UUID-like string if crypto.randomUUID is not available
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}
