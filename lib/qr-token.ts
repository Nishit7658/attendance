import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.QR_SIGNING_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("QR signing secret is not set in environment variables");
  }
  return new TextEncoder().encode(secret);
}

export async function generateQrToken(sessionId: string, intervalSec: number = 10): Promise<string> {
  const payload = { sessionId, ts: Date.now() };
  // Allow a 45s validity window so network latency & scan delay right before rotation don't cause false-positive expired errors
  const validitySec = Math.max(intervalSec + 35, 45);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${validitySec}s`)
    .sign(getSecret());
}

export async function verifyQrToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret(), {
    clockTolerance: 15, // Clock tolerance to handle minor time skews
  });
  return payload as { sessionId: string; ts: number };
}

export function getQrExpiry(intervalSec: number = 10): number {
  return Date.now() + intervalSec * 1000;
}
