import { NextRequest } from "next/server";
import { AppError } from "./api-error";

export function verifyCsrfOrigin(request: NextRequest) {
  // Only apply to POST/PUT/PATCH/DELETE
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;

  let origin = request.headers.get("origin");
  if (!origin) {
    const referer = request.headers.get("referer");
    if (referer) {
      origin = new URL(referer).origin;
    }
  }
  const host = request.headers.get("host");

  if (!origin || !host) {
    throw new AppError("Missing origin/host header. CSRF check failed.", 403);
  }

  const originUrl = new URL(origin);
  if (originUrl.host !== host) {
    throw new AppError("Origin mismatch. CSRF check failed.", 403);
  }
}
