import { verifyCsrfOrigin } from "@/lib/csrf";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import { startSession } from "@/lib/faculty-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    verifyCsrfOrigin(_request);
  } catch (csrfErr) {
    const err = csrfErr as Error & { statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 403 });
  }

  try {
    const user = await requireRole(["FACULTY", "HOD", "ADMIN"]);

    const session = await startSession(params.id, user.id, user.role !== "FACULTY");
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
