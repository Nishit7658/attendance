import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePasswordResetToken } from "@/lib/password-reset-token";
import rateLimit from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/csrf";

// Tight rate limit: 3 requests / 15 min per IP to prevent email bombing
const limiter = rateLimit({ interval: 15 * 60 * 1000, uniqueTokenPerInterval: 500 });

export async function POST(request: NextRequest) {
  try {
    verifyCsrfOrigin(request);

    const ip = request.headers.get("x-forwarded-for") || request.ip || "unknown-ip";
    // Rate limit keyed per IP — not per email, to prevent enumeration via timing
    await limiter.check(3, `forgot-pwd:${ip}`);

    const body = await request.json();
    const rawInput = (typeof body?.identifier === "string" ? body.identifier : "").trim();

    if (!rawInput) {
      return genericOkResponse();
    }

    const lowerInput = rawInput.toLowerCase();
    const cleanPrefix = lowerInput.replace(/@.*$/, "");

    // Look up user by email OR enrollment number — same logic as auth.ts
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: rawInput, mode: "insensitive" } },
          { email: { equals: lowerInput, mode: "insensitive" } },
          { email: { equals: `${cleanPrefix}@student`, mode: "insensitive" } },
          { email: { equals: `${cleanPrefix}@faculty`, mode: "insensitive" } },
          { email: { equals: `${cleanPrefix}@college.edu`, mode: "insensitive" } },
          { email: { equals: `${cleanPrefix}@student.college.edu`, mode: "insensitive" } },
          { email: { equals: `${cleanPrefix}@faculty.college.edu`, mode: "insensitive" } },
          { enrollmentNo: { equals: rawInput, mode: "insensitive" } },
          { enrollmentNo: { equals: cleanPrefix, mode: "insensitive" } },
        ],
      },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    // Always return generic response — don't leak whether email exists
    if (!user || !user.passwordHash) {
      return genericOkResponse();
    }

    const token = await generatePasswordResetToken(user.id, user.passwordHash);
    const baseUrl = request.nextUrl.origin;
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // In production this would be sent via email transport (e.g. Resend, Nodemailer).
    // For now, log to console in dev ONLY — never in production.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Password reset link for ${user.email}:`);
      console.log(`[DEV] ${resetLink}`);
    }

    return genericOkResponse(
      process.env.NODE_ENV !== "production" ? resetLink : undefined
    );
  } catch (err: unknown) {
    if (err === "Rate limit exceeded") {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
    // CSRF or unknown error
    console.error("[forgot-password] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Always returns the same shape, regardless of whether the user exists.
 * This prevents account enumeration by timing or response difference.
 * In dev, optionally surfaces the reset link for testing.
 */
function genericOkResponse(devResetLink?: string) {
  return NextResponse.json({
    message: "If that account exists, a password reset link has been sent.",
    ...(devResetLink ? { _devLink: devResetLink } : {}),
  });
}
