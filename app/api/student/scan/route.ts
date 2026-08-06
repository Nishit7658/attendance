import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { verifyQrToken } from "@/lib/qr-token";
import rateLimit from "@/lib/rate-limit";
import { AppError, handleApiError } from "@/lib/api-error";
import { verifyCsrfOrigin } from "@/lib/csrf";
const scanLimiter = rateLimit({
  uniqueTokenPerInterval: 500,
  interval: 60000,
});

import ipaddr from "ipaddr.js";
import { getSystemConfigBoolean, getSystemConfig } from "@/lib/system-config";

export async function POST(request: NextRequest) {
  try {
    verifyCsrfOrigin(request);

    const user = await requireRole("STUDENT");

    const lanEnabled = await getSystemConfigBoolean("lan_restriction_enabled", false);
    if (lanEnabled) {
      const allowedIpsConfig = await getSystemConfig("lan_allowed_ips", "");
      const allowedList = allowedIpsConfig.split(",").map(s => s.trim()).filter(Boolean);
      
      if (allowedList.length > 0) {
        const clientIpStr = request.ip || request.headers.get("x-forwarded-for")?.split(",")[0].trim();
        
        if (!clientIpStr) {
          throw new AppError("Cannot determine client IP for LAN restriction check", 403);
        }
        
        let isAllowed = false;
        try {
          let clientIp = ipaddr.parse(clientIpStr);
          if (clientIp.kind() === 'ipv6') {
            const ipv6 = clientIp as ipaddr.IPv6;
            if (ipv6.isIPv4MappedAddress()) {
              clientIp = ipv6.toIPv4Address();
            }
          }
          
          for (const pattern of allowedList) {
            if (pattern.includes("/")) {
              const cidr = ipaddr.parseCIDR(pattern);
              if (clientIp.kind() === cidr[0].kind() && clientIp.match(cidr)) {
                isAllowed = true;
                break;
              }
            } else {
              const exact = ipaddr.parse(pattern);
              if (clientIp.kind() === exact.kind() && clientIp.toString() === exact.toString()) {
                isAllowed = true;
                break;
              }
            }
          }
        } catch (e) {
          // Catch parse errors for invalid IPs and deny access safely
        }
        
        if (!isAllowed) {
          throw new AppError("Access denied: You must be on the college campus network to mark attendance.", 403);
        }
      }
    }

    try {
      await scanLimiter.check(5, user.id); // 5 scans per minute per user
    } catch {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const body = await request.json();
    const token = body.token;
    if (!token || typeof token !== "string") {
      throw new AppError("Token is required", 400);
    }

    const cryptoModule = await import("crypto");
    
    // Server-side device binding
    let deviceToken = request.cookies.get("device_token")?.value;
    let isNewDevice = false;
    
    if (!deviceToken) {
      // Generate a new random token if cookie doesn't exist
      deviceToken = cryptoModule.randomUUID();
      isNewDevice = true;
    }

    // We store the HASH of the token in the DB, not the token itself
    const deviceHash = cryptoModule.createHash("sha256").update(deviceToken).digest("hex");

    // Verify QR code token
    let payload: { sessionId: string };
    try {
      payload = await verifyQrToken(token);
    } catch {
      throw new AppError("Invalid or expired QR code", 400);
    }

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { course: true },
    });

    if (!session || session.status !== "ACTIVE") {
      throw new AppError("Session is not active or not found", 400);
    }

    const existing = await prisma.attendanceRecord.findFirst({
      where: { sessionId: session.id, studentId: user.id },
    });

    if (existing) {
      throw new AppError("Already marked", 409);
    }

    // Flagging & Proxy detection logic using server-side device hash
    let isFlagged = false;
    let flagReason: string | undefined = undefined;

    // 1. Check if this same device was ALREADY used by a DIFFERENT student in this session
    const sameSessionDeviceRecord = await prisma.attendanceRecord.findFirst({
      where: {
        sessionId: session.id,
        deviceId: deviceHash,
        studentId: { not: user.id },
      },
      include: { student: { select: { name: true } } },
    });

    if (sameSessionDeviceRecord) {
      isFlagged = true;
      flagReason = `Proxy Flag: Same phone used by multiple students in this session (${sameSessionDeviceRecord.student.name})`;
    } else {
      // 2. Check if this same device was used by a DIFFERENT student in the last 24 hours.
      //    Using a rolling window avoids timezone mismatches between the server clock and
      //    the college's local time (e.g. UTC server vs IST college).
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const sameDayOtherStudentRecord = await prisma.attendanceRecord.findFirst({
        where: {
          markedAt: { gte: oneDayAgo },
          deviceId: deviceHash,
          studentId: { not: user.id },
        },
        include: { student: { select: { name: true } } },
      });

      if (sameDayOtherStudentRecord) {
        isFlagged = true;
        flagReason = `Proxy Flag: Same phone used by ${sameDayOtherStudentRecord.student.name} today`;
      }
    }

    // Bind primary deviceId hash to student user profile on first scan if not set
    const studentObj = await prisma.user.findUnique({
      where: { id: user.id },
      select: { deviceId: true },
    });
    if (!studentObj?.deviceId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { deviceId: deviceHash },
      });
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: user.id,
        status: "PRESENT",
        markedById: user.id,
        deviceId: deviceHash,
        isFlagged,
        flagReason,
      },
    });

    const response = NextResponse.json({
      success: true,
      recordId: record.id,
      courseName: session.course.name,
      isFlagged,
      flagReason,
    });

    if (isNewDevice) {
      response.cookies.set("device_token", deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    return response;
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
