import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ImportEntity = "users" | "courses";
type RowResult = { row: number; status: "ok" | "skipped" | "error"; message: string };

function parseCSV(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authSession = await auth();
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentUser = await prisma.user.findUnique({
      where: { email: authSession.user.email },
    });
    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const entity = formData.get("entity") as ImportEntity | null;
    const file = formData.get("file") as File | null;

    if (!entity || !["users", "courses"].includes(entity)) {
      return NextResponse.json({ error: "Invalid entity. Must be 'users' or 'courses'." }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row." }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.toLowerCase());
    const dataRows = rows.slice(1);
    const results: RowResult[] = [];

    if (entity === "users") {
      // Expected headers: name, email, role, department (optional), password (optional)
      const nameIdx = headers.indexOf("name");
      const emailIdx = headers.indexOf("email");
      const roleIdx = headers.indexOf("role");
      const deptIdx = headers.indexOf("department");
      const pwdIdx = headers.indexOf("password");

      if (nameIdx === -1 || emailIdx === -1 || roleIdx === -1) {
        return NextResponse.json({
          error: "CSV for users must have 'name', 'email', and 'role' columns.",
        }, { status: 400 });
      }

      const validRoles = ["STUDENT", "FACULTY", "HOD", "ADMIN"];
      const defaultPassword = await bcrypt.hash("password123", 12);

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2; // 1-indexed, skip header

        const name = row[nameIdx]?.trim();
        const email = row[emailIdx]?.trim().toLowerCase();
        const role = row[roleIdx]?.trim().toUpperCase();
        const department = deptIdx !== -1 ? row[deptIdx]?.trim() : null;
        const password = pwdIdx !== -1 && row[pwdIdx]?.trim()
          ? row[pwdIdx].trim()
          : "password123";

        if (!name || !email || !role) {
          results.push({ row: rowNum, status: "skipped", message: "Missing required fields (name, email, role)" });
          continue;
        }

        if (!validRoles.includes(role)) {
          results.push({ row: rowNum, status: "error", message: `Invalid role '${role}'. Must be one of: ${validRoles.join(", ")}` });
          continue;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          results.push({ row: rowNum, status: "error", message: `Invalid email format: ${email}` });
          continue;
        }

        // Check for duplicate
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          results.push({ row: rowNum, status: "skipped", message: `Duplicate email: ${email}` });
          continue;
        }

        const passwordHash = password === "password123"
          ? defaultPassword
          : await bcrypt.hash(password, 12);

        await prisma.user.create({
          data: {
            name,
            email,
            role: role as "STUDENT" | "FACULTY" | "HOD" | "ADMIN",
            passwordHash,
            department: department || null,
          },
        });

        results.push({ row: rowNum, status: "ok", message: `Created ${role.toLowerCase()}: ${name}` });
      }
    } else if (entity === "courses") {
      // Expected headers: code, name, department (optional), credits (optional)
      const codeIdx = headers.indexOf("code");
      const nameIdx = headers.indexOf("name");
      const deptIdx = headers.indexOf("department");
      const creditsIdx = headers.indexOf("credits");

      if (codeIdx === -1 || nameIdx === -1) {
        return NextResponse.json({
          error: "CSV for courses must have 'code' and 'name' columns.",
        }, { status: 400 });
      }

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;

        const code = row[codeIdx]?.trim().toUpperCase();
        const name = row[nameIdx]?.trim();
        const department = deptIdx !== -1 ? row[deptIdx]?.trim() : "General";
        const credits = creditsIdx !== -1 ? parseInt(row[creditsIdx]?.trim() || "3", 10) : 3;

        if (!code || !name) {
          results.push({ row: rowNum, status: "skipped", message: "Missing required fields (code, name)" });
          continue;
        }

        const existing = await prisma.course.findUnique({ where: { code } });
        if (existing) {
          results.push({ row: rowNum, status: "skipped", message: `Duplicate code: ${code}` });
          continue;
        }

        await prisma.course.create({
          data: {
            code,
            name,
            department,
            credits: isNaN(credits) ? 3 : credits,
          },
        });

        results.push({ row: rowNum, status: "ok", message: `Created course: ${code} - ${name}` });
      }
    }

    const ok = results.filter((r) => r.status === "ok").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      summary: { total: results.length, ok, skipped, errors },
      results,
    });
  } catch (err: unknown) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
