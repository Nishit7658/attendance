import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
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
