import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: authSession.user.id },
      select: { id: true, role: true },
    });

    if (!currentUser || !["FACULTY", "HOD", "ADMIN"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { studentId } = await request.json();
    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: studentId },
      data: { deviceId: null },
    });

    return NextResponse.json({
      success: true,
      message: "Student registered device lock has been reset.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
