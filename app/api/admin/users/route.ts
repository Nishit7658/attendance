import { verifyCsrfOrigin } from "@/lib/csrf";
import { requireRole } from "@/lib/api-auth";
import { createUserSchema, validatePayload } from "@/lib/zod-schemas";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const ADMIN_ROLES: Role[] = ["STUDENT", "FACULTY", "HOD", "ADMIN"];

export async function GET(req: Request) {
  await requireRole("ADMIN");

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role");
  const listOnly = searchParams.get("list") === "true";

  const roleFilterValue = roleFilter && ADMIN_ROLES.includes(roleFilter as Role) ? roleFilter as Role : undefined;
  const where = roleFilterValue ? { role: roleFilterValue } : {};

  if (listOnly) {
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, department: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ users });
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
    const { data: parsedData, error: validationError } = validatePayload(createUserSchema, rawBody);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const { name, email, password, role, department } = parsedData!;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password, and role are required" }, { status: 400 });
    }

    if (!ADMIN_ROLES.includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Name must be 100 characters or less" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, department: department || null },
      select: { id: true, name: true, email: true, role: true, department: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

