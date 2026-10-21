import { verifyCsrfOrigin } from "@/lib/csrf";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/api-auth";
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
    verifyCsrfOrigin(request);
  } catch (csrfErr) {
    const err = csrfErr as Error & { statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 403 });
  }

  try {
    // Auth check
    await requireRole("ADMIN");

    const formData = await request.formData();
    const entity = formData.get("entity") as ImportEntity | null;
    const file = formData.get("file") as File | null;

    if (!entity || !["users", "courses"].includes(entity)) {
      return NextResponse.json({ error: "Invalid entity. Must be 'users' or 'courses'." }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum allowed size is 5 MB." }, { status: 400 });
    }

    const fallbackBranch = await prisma.branch.findFirst();
    const fallbackBranchId = fallbackBranch?.id;

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
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      type Candidate = {
        rowNum: number;
        name: string;
        email: string;
        role: "STUDENT" | "FACULTY" | "HOD" | "ADMIN";
        department: string | null;
        password: string;
      };

      const candidates: Candidate[] = [];
      const seenEmails = new Set<string>();

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

        if (!emailRegex.test(email)) {
          results.push({ row: rowNum, status: "error", message: `Invalid email format: ${email}` });
          continue;
        }

        if (seenEmails.has(email)) {
          results.push({ row: rowNum, status: "skipped", message: `Duplicate email: ${email}` });
          continue;
        }
        seenEmails.add(email);

        candidates.push({
          rowNum,
          name,
          email,
          role: role as Candidate["role"],
          department: department || null,
          password,
        });
      }

      // One batch lookup instead of a per-row round trip to find existing emails
      const existingUsers = candidates.length
        ? await prisma.user.findMany({
            where: { email: { in: candidates.map((c) => c.email) } },
            select: { email: true },
          })
        : [];
      const existingEmails = new Set(existingUsers.map((u) => u.email));

      const toCreate = candidates.filter((c) => {
        if (existingEmails.has(c.email)) {
          results.push({ row: c.rowNum, status: "skipped", message: `Duplicate email: ${c.email}` });
          return false;
        }
        return true;
      });

      // Hash custom passwords concurrently (CPU-bound, not a DB round trip)
      const createData = await Promise.all(
        toCreate.map(async (c) => ({
          rowNum: c.rowNum,
          name: c.name,
          email: c.email,
          role: c.role,
          department: c.department,
          passwordHash: c.password === "password123" ? defaultPassword : await bcrypt.hash(c.password, 12),
        }))
      );

      if (createData.length) {
        await prisma.user.createMany({
          data: createData.map((c) => ({
            name: c.name,
            email: c.email,
            role: c.role,
            passwordHash: c.passwordHash,
            department: c.department,
          })),
        });
      }

      for (const c of createData) {
        results.push({ row: c.rowNum, status: "ok", message: `Created ${c.role.toLowerCase()}: ${c.name}` });
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

      type CourseCandidate = {
        rowNum: number;
        code: string;
        name: string;
        department: string;
        credits: number;
      };

      const candidates: CourseCandidate[] = [];
      const seenCodes = new Set<string>();

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

        if (!fallbackBranchId) {
          results.push({ row: rowNum, status: "error", message: "No branch available to associate with course" });
          continue;
        }

        if (seenCodes.has(code)) {
          results.push({ row: rowNum, status: "skipped", message: `Duplicate code: ${code}` });
          continue;
        }
        seenCodes.add(code);

        candidates.push({ rowNum, code, name, department, credits: isNaN(credits) ? 3 : credits });
      }

      // One batch lookup instead of a per-row round trip to find existing codes
      const existingCourses = candidates.length
        ? await prisma.course.findMany({
            where: { code: { in: candidates.map((c) => c.code) } },
            select: { code: true },
          })
        : [];
      const existingCodes = new Set(existingCourses.map((c) => c.code));

      const toCreate = candidates.filter((c) => {
        if (existingCodes.has(c.code)) {
          results.push({ row: c.rowNum, status: "skipped", message: `Duplicate code: ${c.code}` });
          return false;
        }
        return true;
      });

      if (toCreate.length) {
        await prisma.course.createMany({
          data: toCreate.map((c) => ({
            code: c.code,
            name: c.name,
            department: c.department,
            credits: c.credits,
            branchId: fallbackBranchId!,
          })),
        });
      }

      for (const c of toCreate) {
        results.push({ row: c.rowNum, status: "ok", message: `Created course: ${c.code} - ${c.name}` });
      }
    }

    results.sort((a, b) => a.row - b.row);

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
