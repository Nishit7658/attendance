import { createEventSchema, validatePayload } from "@/lib/zod-schemas";
import { verifyCsrfOrigin } from "@/lib/csrf";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireRole("ADMIN");

    const events = await prisma.event.findMany({
      include: {
        createdBy: { select: { name: true } },
        savedGroup: { select: { name: true } },
        _count: { select: { scopeItems: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ events });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyCsrfOrigin(request);
  } catch (csrfErr) {
    const err = csrfErr as Error & { statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 403 });
  }

  try {
    const currentUser = await requireRole("ADMIN");

    const rawBody = await request.json();
    const { data: parsedData, error: validationError } = validatePayload(createEventSchema, rawBody);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const { name, description, startDate, endDate, scopeType, department, savedGroupId, studentIds } = parsedData!;

    if (!name || !startDate || !endDate || !scopeType) {
      return NextResponse.json({ error: "Name, startDate, endDate, and scopeType are required" }, { status: 400 });
    }

    if (scopeType === "DEPARTMENT" && !department) {
      return NextResponse.json({ error: "Department is required for DEPARTMENT scope" }, { status: 400 });
    }

    if (scopeType === "SAVED_GROUP" && !savedGroupId) {
      return NextResponse.json({ error: "savedGroupId is required for SAVED_GROUP scope" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start >= end) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
    }

    // Resolve student IDs based on scope
    let resolvedStudentIds: string[] = [];

    if (scopeType === "DEPARTMENT") {
      const students = await prisma.user.findMany({
        where: { role: "STUDENT", department },
        select: { id: true },
      });
      resolvedStudentIds = students.map((s) => s.id);
    } else if (scopeType === "SAVED_GROUP" && savedGroupId) {
      const members = await prisma.savedGroupMember.findMany({
        where: { savedGroupId },
        select: { studentId: true },
      });
      resolvedStudentIds = members.map((m) => m.studentId);
    } else if (scopeType === "CUSTOM_LIST" && studentIds?.length) {
      resolvedStudentIds = studentIds;
    }

    // Deduplicate
    resolvedStudentIds = [...new Set(resolvedStudentIds)];

    const event = await prisma.event.create({
      data: {
        name,
        description: description || null,
        startDate: start,
        endDate: end,
        scopeType,
        department: department || null,
        savedGroupId: savedGroupId || null,
        createdById: currentUser.id,
        scopeItems: {
          create: resolvedStudentIds.map((studentId) => ({ studentId })),
        },
      },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { scopeItems: true } },
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

