import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPasswordResetToken } from "@/lib/password-reset-token";
import bcrypt from "bcryptjs";
import rateLimit from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/csrf";

// Rate limit the reset endpoint too — prevents brute-forcing tokens
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function POST(request: NextRequest) {
  try {
    verifyCsrfOrigin(request);

    const ip = request.headers.get("x-forwarded-for") || request.ip || "unknown-ip";
    await limiter.check(10, `reset-pwd:${ip}`);

    const body = await request.json();
    const token: unknown = body?.token;
    const newPassword: unknown = body?.newPassword;
    const confirmPassword: unknown = body?.confirmPassword;

    if (typeof token !== "string" || !token) {
      return NextResponse.json({ error: "Missing reset token" }, { status: 400 });
    }
    if (typeof newPassword !== "string" || typeof confirmPassword !== "string") {
      return NextResponse.json({ error: "Missing password fields" }, { status: 400 });
    }

    // ── Password strength enforcement ───────────────────────────────────────
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }
    // Require at least one number or special character
    if (!/[0-9!@#$%^&*]/.test(newPassword)) {
      return NextResponse.json(
        { error: "Password must contain at least one number or special character (!@#$%^&*)" },
        { status: 400 }
      );
    }

    // ── Step 1: Decode token header to get sub (userId) without verifying yet ─
    // We need the userId to look up the current password hash (for version check).
    // We can't use jwtVerify yet because we need the hash first.
    // Instead, do a two-step: parse sub from payload, fetch user, then fully verify.
    let userId: string;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("malformed");
      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
      const parsed = JSON.parse(payloadJson) as { sub?: unknown; purpose?: unknown };
      if (typeof parsed.sub !== "string" || parsed.purpose !== "password-reset") {
        throw new Error("invalid purpose");
      }
      userId = parsed.sub;
    } catch {
      return NextResponse.json({ error: "Invalid or malformed reset token" }, { status: 400 });
    }

    // ── Step 2: Fetch user ────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
    }

    // ── Step 3: Cryptographically verify token signature + expiry + version ───
    try {
      await verifyPasswordResetToken(token, user.passwordHash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Token verification failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // ── Step 4: Hash new password at cost 12 (consistent with the rest of app) ─
    const newHash = await bcrypt.hash(newPassword, 12);

    // ── Step 5: Persist. New hash → version fingerprint changes → token invalid ─
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (err: unknown) {
    if (err === "Rate limit exceeded") {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
    console.error("[reset-password] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
