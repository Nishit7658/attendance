import { requireRole } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export async function GET() {
  await requireRole("ADMIN");

  const divisions = await prisma.division.findMany({
    select: {
      id: true,
      name: true,
      semester: {
        select: {
          number: true,
          branch: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { semester: { branch: { name: "asc" } } },
      { semester: { number: "asc" } },
      { name: "asc" },
    ],
  });

  return NextResponse.json({ divisions });
}
