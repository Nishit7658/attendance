import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppError, handleApiError } from "@/lib/api-error";
import { verifyCsrfOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  try {
    verifyCsrfOrigin(request);
    
    await requireRole("ADMIN");

    const { action, academicYear } = await request.json();

    if (action === "archive") {
      if (!academicYear) throw new AppError("academicYear is required for archiving", 400);

      // Soft archive all unarchived sessions
      const result = await prisma.session.updateMany({
        where: { isArchived: false },
        data: { isArchived: true, academicYear },
      });

      return NextResponse.json({ success: true, archivedCount: result.count });
    } 
    else if (action === "purge") {
      if (!academicYear) throw new AppError("academicYear is required for purging", 400);
      
      // Hard delete all sessions for the given academic year
      // This will cascade delete AttendanceRecords and EditLogs
      const result = await prisma.session.deleteMany({
        where: { isArchived: true, academicYear },
      });

      return NextResponse.json({ success: true, deletedCount: result.count });
    }
    else {
      throw new AppError("Invalid action", 400);
    }
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
