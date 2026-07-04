import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: "asc" },
    });

    const settings: Record<string, string> = {};
    for (const c of configs) {
      settings[c.key] = c.value;
    }

    return NextResponse.json({ settings });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const validKeys = [
      "slots_per_day",
      "lan_restriction_enabled",
      "lan_allowed_ips",
      "academic_year",
      "min_attendance_percentage",
      "qr_refresh_interval",
    ];

    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: `Invalid setting key: ${key}` }, { status: 400 });
    }

    // Validate values
    if (key === "slots_per_day" || key === "min_attendance_percentage" || key === "qr_refresh_interval") {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        return NextResponse.json({ error: `${key} must be a positive number` }, { status: 400 });
      }
    }

    if (key === "lan_restriction_enabled" && !["true", "false"].includes(value)) {
      return NextResponse.json({ error: "lan_restriction_enabled must be 'true' or 'false'" }, { status: 400 });
    }

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });

    return NextResponse.json({ config });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
