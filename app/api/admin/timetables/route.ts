import { verifyCsrfOrigin } from "@/lib/csrf";
import { requireRole } from "@/lib/api-auth";
import { createTimetableSchema, validatePayload } from "@/lib/zod-schemas";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { data: parsedData, error: validationError } = validatePayload(createTimetableSchema, rawBody);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const { dayOfWeek, startTime, endTime, courseId, facultyId, room, section, divisionId, batchId } = parsedData!;

    if (dayOfWeek === undefined || !startTime || !endTime || !courseId || !facultyId || !room || !divisionId) {
      return NextResponse.json({ error: "dayOfWeek, startTime, endTime, courseId, facultyId, room, and divisionId are required" }, { status: 400 });
    }

    const day = Number(dayOfWeek);
    if (isNaN(day) || day < 0 || day > 6) {
      return NextResponse.json({ error: "dayOfWeek must be between 0 and 6" }, { status: 400 });
    }

    const st = new Date(startTime);
    const et = new Date(endTime);
    if (isNaN(st.getTime()) || isNaN(et.getTime())) {
      return NextResponse.json({ error: "Invalid start or end time" }, { status: 400 });
    }
    if (st >= et) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const [course, faculty, division] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.user.findUnique({ where: { id: facultyId } }),
      prisma.division.findUnique({ where: { id: divisionId } }),
    ]);

    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    if (!faculty || faculty.role !== "FACULTY") {
      return NextResponse.json({ error: "Faculty not found or user is not a faculty member" }, { status: 404 });
    }
    if (!division) return NextResponse.json({ error: "Division not found" }, { status: 404 });

    // Validate batchId if provided
    if (batchId) {
      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const overlapping = await prisma.timetableEntry.findFirst({
      where: {
        facultyId,
        dayOfWeek: day,
        AND: [
          { startTime: { lt: et } },
          { endTime: { gt: st } },
        ],
      },
    });
    if (overlapping) {
      return NextResponse.json({ error: "Time slot overlaps with an existing entry for this faculty" }, { status: 409 });
    }

    const entry = await prisma.timetableEntry.create({
      data: {
        dayOfWeek: day,
        startTime: st,
        endTime: et,
        courseId,
        facultyId,
        room,
        section: section ?? null,
        divisionId,
        batchId: batchId ?? null,
      },
      include: { course: true, faculty: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Error creating timetable entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


