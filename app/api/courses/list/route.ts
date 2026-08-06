import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export async function GET() {
  await requireAuth();

  const courses = await prisma.course.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ courses });
}
