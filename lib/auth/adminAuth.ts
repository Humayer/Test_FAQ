import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "dp_hr_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured. Set it in your .env file.");
  }
  return secret;
}

export interface AdminSessionPayload {
  email: string;
}

/** Verifies email/password against the ADMIN_EMAIL / ADMIN_PASSWORD_HASH_BASE64 env vars. */
export function verifyAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const encodedHash = process.env.ADMIN_PASSWORD_HASH_BASE64;

  if (!adminEmail || !encodedHash) {
    throw new Error(
      "Admin credentials are not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH_BASE64 in your .env file."
    );
  }

  if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
    return false;
  }

  // The hash is stored base64-encoded because a raw bcrypt hash contains
  // literal "$" characters that many .env loaders (including Next.js's)
  // silently mangle via shell-style variable expansion. See
  // scripts/hash-password.js for where this encoding happens.
  let hash: string;
  try {
    hash = Buffer.from(encodedHash, "base64").toString("utf8");
  } catch {
    return false;
  }

  return bcrypt.compareSync(password, hash);
}

export function createAdminSessionToken(payload: AdminSessionPayload): string {
  return jwt.sign(payload, getAuthSecret(), { expiresIn: SESSION_TTL_SECONDS });
}

export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  try {
    return jwt.verify(token, getAuthSecret()) as AdminSessionPayload;
  } catch {
    return null;
  }
}

export async function setAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export const ADMIN_SESSION_COOKIE_NAME = COOKIE_NAME;
