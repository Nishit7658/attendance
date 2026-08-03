import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.QR_SIGNING_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("QR signing secret is not set in environment variables");
  }
  return new TextEncoder().encode(secret);
}

export async function generateQrToken(sessionId: string): Promise<string> {
  const payload = { sessionId, ts: Date.now() };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10s")
    .sign(getSecret());
}

export async function verifyQrToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret(), {
    clockTolerance: 5, // Tight clock tolerance
  });
  return payload as { sessionId: string; ts: number };
}

export function getQrExpiry(): number {
  return Date.now() + 10000;
}
