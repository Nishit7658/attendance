import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppError, handleApiError } from "@/lib/api-error";
import { getUnmarkedCount } from "@/lib/faculty-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    const sessionId = params.id;
    if (!sessionId) {
      throw new AppError("Session ID is required", 400);
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    const count = await getUnmarkedCount(sessionId);
    return NextResponse.json({ count, isAdHoc: session?.isAdHoc ?? false });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
