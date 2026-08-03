import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import rateLimit from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 });

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.ip || "unknown-ip";
    await limiter.check(100, ip); // 100 requests per minute per IP
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  try {
    const pngBuffer = await QRCode.toBuffer(token, {
      type: "png",
      width: 512,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
