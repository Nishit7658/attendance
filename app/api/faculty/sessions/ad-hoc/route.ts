import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdHocSession } from "@/lib/faculty-service";

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
    if (!user || !["FACULTY", "HOD", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { courseCode } = await request.json();
    if (!courseCode || typeof courseCode !== "string") {
      return NextResponse.json(
        { error: "courseCode is required" },
        { status: 400 }
      );
    }

    const session = await createAdHocSession(courseCode, user.id);
    return NextResponse.json({
      sessionId: session!.id,
      redirect: `/faculty/sessions/${session!.id}/live`,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "An error occurred" }, { status: 400 });
  }
}
