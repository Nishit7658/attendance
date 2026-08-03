import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { AppError, handleApiError } from "@/lib/api-error";
import { getUnmarkedCount } from "@/lib/faculty-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["FACULTY", "HOD", "ADMIN"]);

    const sessionId = params.id;
    if (!sessionId) {
      throw new AppError("Session ID is required", 400);
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { facultyId: true, isAdHoc: true },
    });

    if (!session) {
      throw new AppError("Session not found", 404);
    }

    // HOD and ADMIN can see any session; Faculty can only see their own
    if (user.role === "FACULTY" && session.facultyId !== user.id) {
      throw new AppError("Forbidden", 403);
    }

    const count = await getUnmarkedCount(sessionId);
    return NextResponse.json({ count, isAdHoc: session.isAdHoc });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}