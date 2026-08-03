import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { eid: string } }
) {
  try {
    await requireRole("ADMIN");

    const event = await prisma.event.findUnique({
      where: { id: params.eid },
      include: {
        createdBy: { select: { name: true } },
        savedGroup: { select: { id: true, name: true } },
        _count: { select: { scopeItems: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { eid: string } }
) {
  try {
    await requireRole("ADMIN");

    await prisma.event.delete({ where: { id: params.eid } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
