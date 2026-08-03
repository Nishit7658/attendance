import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import rateLimit from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/csrf";

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 });

export async function POST(request: NextRequest) {
  try {
    verifyCsrfOrigin(request);

    const ip = request.headers.get("x-forwarded-for") || request.ip || "unknown-ip";
    const user = await requireAuth();
    await limiter.check(5, `${ip}-${user.id}`); // 5 requests per minute

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect current password" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully!",
    });
  } catch (err: unknown) {
    if (err === "Rate limit exceeded") {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}