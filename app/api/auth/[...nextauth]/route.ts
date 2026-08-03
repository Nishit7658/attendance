import { NextRequest } from "next/server";
import rateLimit from "@/lib/rate-limit";
import { handlers } from "@/lib/auth";

// Login is the highest-risk brute-force surface. Limit by client identifier
// (IP forwarded from the proxy, falling back to the raw socket address).
const loginLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 1000,
});

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? request.ip ?? "unknown";
}

export function GET(request: NextRequest) {
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  try {
    const identifier = getClientIdentifier(request);
    // 20 login attempts per 15-minute window per client.
    await loginLimiter.check(20, `login:${identifier}`);
  } catch {
    return Response.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 }
    );
  }
  return handlers.POST(request);
}