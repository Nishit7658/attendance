import { verifyCsrfOrigin } from "@/lib/csrf";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import { endSession } from "@/lib/faculty-service";

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

    const body = await _request.json().catch(() => ({}));
    const autoMarkAbsent = body.autoMarkAbsent !== false; // default true

    await endSession(params.id, user.id, user.role !== "FACULTY", autoMarkAbsent);
    return NextResponse.json({
      redirect: `/faculty/sessions/${params.id}/summary`,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "An error occurred" }, { status: 400 });
  }
}
