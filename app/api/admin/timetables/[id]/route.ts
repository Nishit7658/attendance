import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (currentUser?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entry = await prisma.timetableEntry.findUnique({
    where: { id: params.id },
    include: {
      course: { select: { id: true, code: true, name: true } },
      faculty: { select: { id: true, name: true } },
    },
  });

  if (!entry) return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });

  return NextResponse.json({ entry });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (currentUser?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { dayOfWeek, startTime, endTime, courseId, facultyId, room, section } = await req.json();

    const existing = await prisma.timetableEntry.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });

    if (dayOfWeek !== undefined) {
      const day = Number(dayOfWeek);
      if (isNaN(day) || day < 0 || day > 6) {
        return NextResponse.json({ error: "dayOfWeek must be between 0 and 6" }, { status: 400 });
      }
    }

    const finalFacultyId = facultyId ?? existing.facultyId;
    const finalDay = dayOfWeek !== undefined ? Number(dayOfWeek) : existing.dayOfWeek;
    const st = startTime ? new Date(startTime) : existing.startTime;
    const et = endTime ? new Date(endTime) : existing.endTime;

    if (startTime && endTime) {
      if (isNaN(st.getTime()) || isNaN(et.getTime())) {
        return NextResponse.json({ error: "Invalid start or end time" }, { status: 400 });
      }
      if (st >= et) {
        return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
      }
    }

    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (facultyId) {
      const faculty = await prisma.user.findUnique({ where: { id: facultyId } });
      if (!faculty || faculty.role !== "FACULTY") {
        return NextResponse.json({ error: "Faculty not found or user is not a faculty member" }, { status: 404 });
      }
    }

    const overlapping = await prisma.timetableEntry.findFirst({
      where: {
        id: { not: params.id },
        facultyId: finalFacultyId,
        dayOfWeek: finalDay,
        AND: [
          { startTime: { lt: et } },
          { endTime: { gt: st } },
        ],
      },
    });
    if (overlapping) {
      return NextResponse.json({ error: "Time slot overlaps with an existing entry for this faculty" }, { status: 409 });
    }

    const entry = await prisma.timetableEntry.update({
      where: { id: params.id },
      data: {
        ...(dayOfWeek !== undefined && { dayOfWeek: Number(dayOfWeek) }),
        ...(startTime !== undefined && { startTime: st }),
        ...(endTime !== undefined && { endTime: et }),
        ...(courseId !== undefined && { courseId }),
        ...(facultyId !== undefined && { facultyId }),
        ...(room !== undefined && { room }),
        ...(section !== undefined && { section }),
      },
      include: { course: true, faculty: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Error updating timetable entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (currentUser?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const existing = await prisma.timetableEntry.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });

    await prisma.timetableEntry.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting timetable entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
