import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only Admin can unbind a device
    await requireRole("ADMIN");

    const userId = params.id;
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deviceId: null },
    });

    return NextResponse.json({ success: true, message: "Device unbound successfully." });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("Error unbinding device:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
