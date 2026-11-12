import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "careerops_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  userId: string;
  email: string;
  fullName: string;
  exp: number;
};

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET deve estar configurado em produção com pelo menos 16 caracteres.");
  }
  return "careerops-dev-fallback-secret-change-in-prod";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSessionToken(payload: Omit<SessionUser, "exp">): string {
  const fullPayload: SessionUser = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const data = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  try {
    const expectedSig = crypto.createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
    const sigBuf = Buffer.from(sig, "utf8");
    const expectedBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionUser;
    if (!parsed.userId || !parsed.email || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
