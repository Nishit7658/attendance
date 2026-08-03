import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireRole("ADMIN");

    const groups = await prisma.savedGroup.findMany({
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ groups });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireRole("ADMIN");

    const { name, description, studentIds } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = await prisma.savedGroup.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "A group with this name already exists" }, { status: 409 });
    }

    const group = await prisma.savedGroup.create({
      data: {
        name,
        description: description || null,
        createdById: currentUser.id,
        members: studentIds?.length
          ? { create: studentIds.map((sid: string) => ({ studentId: sid })) }
          : undefined,
      },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }

    await prisma.savedGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

