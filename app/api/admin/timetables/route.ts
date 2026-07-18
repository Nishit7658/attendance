import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (currentUser?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { dayOfWeek, startTime, endTime, courseId, facultyId, room, section } = await req.json();

    if (dayOfWeek === undefined || !startTime || !endTime || !courseId || !facultyId || !room || !section) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
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

    const [course, faculty] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.user.findUnique({ where: { id: facultyId } }),
    ]);

    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    if (!faculty || faculty.role !== "FACULTY") {
      return NextResponse.json({ error: "Faculty not found or user is not a faculty member" }, { status: 404 });
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
        section,
        divisionId: "default-division-id",
      },
      include: { course: true, faculty: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Error creating timetable entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
