import { jwtVerify } from "jose";
import { DEFAULT_TENANT_ID } from "./tenant-context";
import type { JWTPayload } from "./auth";

function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecret();
    if (!secret) return null;
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
    if (payload.type !== "access") return null;
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      role: payload.role as JWTPayload["role"],
      tenantId: (payload.tenantId as string) || DEFAULT_TENANT_ID,
    };
  } catch {
    return null;
  }
}
