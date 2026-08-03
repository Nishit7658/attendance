import { requireRole } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireRole("ADMIN");

  const course = await prisma.course.findUnique({ where: { id: params.id } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  return NextResponse.json({ course });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await requireRole("ADMIN");

  try {
    const { code, name, department, credits } = await req.json();

    const existing = await prisma.course.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    if (code && code !== existing.code) {
      const codeTaken = await prisma.course.findUnique({ where: { code } });
      if (codeTaken) return NextResponse.json({ error: "A course with this code already exists" }, { status: 409 });
    }

    const course = await prisma.course.update({
      where: { id: params.id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(department !== undefined && { department }),
        ...(credits !== undefined && { credits }),
      },
    });

    return NextResponse.json({ course });
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await requireRole("ADMIN");

  try {
    const existing = await prisma.course.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    await prisma.course.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
