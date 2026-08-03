import { verifyCsrfOrigin } from "@/lib/csrf";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import { createAdHocSession } from "@/lib/faculty-service";

export async function POST(request: NextRequest) {
  try {
    verifyCsrfOrigin(request);
  } catch (csrfErr) {
    const err = csrfErr as Error & { statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 403 });
  }

  try {
    const user = await requireRole(["FACULTY", "HOD", "ADMIN"]);

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
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "An error occurred" }, { status: 400 });
  }
}
