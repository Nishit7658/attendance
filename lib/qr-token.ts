import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "8f3d1e4a7c9b2e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f";
  return new TextEncoder().encode(secret);
}

export async function generateQrToken(sessionId: string): Promise<string> {
  const payload = { sessionId, ts: Date.now() };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30s")
    .sign(getSecret());
}

export async function verifyQrToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as { sessionId: string; ts: number };
}

export function getQrExpiry(): number {
  return Date.now() + 30000;
}
