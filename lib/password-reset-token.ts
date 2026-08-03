import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";

function getSecret(): Uint8Array {
  const secret = process.env.QR_SIGNING_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Signing secret is not configured");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Derives a short version fingerprint from the first 16 chars of the bcrypt hash.
 * When the user changes their password, the fingerprint changes → all previously
 * issued reset tokens become invalid immediately (version invalidation).
 */
function deriveVersionClaim(passwordHashSlice: string): string {
  return createHash("sha256").update(passwordHashSlice).digest("hex").slice(0, 12);
}

export interface ResetTokenPayload {
  sub: string;     // userId
  purpose: "password-reset";
  v: string;       // version fingerprint — invalidated when password changes
}

export async function generatePasswordResetToken(
  userId: string,
  passwordHash: string
): Promise<string> {
  const v = deriveVersionClaim(passwordHash.slice(0, 16));
  return new SignJWT({ purpose: "password-reset", v } satisfies Omit<ResetTokenPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(getSecret());
}

export async function verifyPasswordResetToken(
  token: string,
  currentPasswordHash: string
): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, getSecret(), {
    clockTolerance: 15, // 15s tolerance as specified
  });

  // Enforce purpose claim — can never be replayed as a QR or session token
  if (payload["purpose"] !== "password-reset") {
    throw new Error("Invalid token purpose");
  }

  // Enforce version claim — check it still matches the current password hash
  const expectedV = deriveVersionClaim((currentPasswordHash).slice(0, 16));
  if (payload["v"] !== expectedV) {
    throw new Error("Reset token has been invalidated — password already changed");
  }

  return { userId: payload.sub! };
}
