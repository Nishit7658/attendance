import { verifyCsrfOrigin } from "@/lib/csrf";
import { requireRole } from "@/lib/api-auth";
import { createCourseSchema, validatePayload } from "@/lib/zod-schemas";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  await requireRole("ADMIN");

  const { searchParams } = new URL(req.url);
  const listOnly = searchParams.get("list") === "true";

  if (listOnly) {
    const courses = await prisma.course.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ courses });
  }

  const courses = await prisma.course.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ courses });
}

export async function POST(req: Request) {
  try {
    verifyCsrfOrigin(req);
  } catch (csrfErr) {
    const err = csrfErr as Error & { statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 403 });
  }

  await requireRole("ADMIN");

  try {
    const rawBody = await req.json();
    const { data: parsedData, error: validationError } = validatePayload(createCourseSchema, rawBody);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const { code, name, department, credits, branchId } = parsedData!;

    if (!code || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.course.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "A course with this code already exists" }, { status: 409 });
    }

    const course = await prisma.course.create({
      data: { code, name, department, credits: credits ?? 3, branchId: branchId || "default-branch-id" },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

