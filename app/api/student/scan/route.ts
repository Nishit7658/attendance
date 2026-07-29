import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyQrToken } from "@/lib/qr-token";

export async function POST(request: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authSession.user.id },
      select: { id: true, role: true },
    });
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { token } = await request.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    let payload: { sessionId: string };
    try {
      payload = await verifyQrToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired QR code" }, { status: 400 });
    }

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { course: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json({ error: "Session is not active" }, { status: 400 });
    }

    const existing = await prisma.attendanceRecord.findFirst({
      where: { sessionId: session.id, studentId: user.id },
    });

    if (existing) {
      return NextResponse.json({ error: "Already marked" }, { status: 409 });
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: user.id,
        status: "PRESENT",
        markedById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      recordId: record.id,
      courseName: session.course.name,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
