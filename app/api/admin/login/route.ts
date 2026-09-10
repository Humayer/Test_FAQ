import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminCredentials, createAdminSessionToken, setAdminSessionCookie } from "@/lib/auth/adminAuth";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Stricter limit on login attempts to slow down brute-forcing.
  const rl = rateLimit(`login:${getClientKey(req)}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const valid = verifyAdminCredentials(parsed.email, parsed.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = createAdminSessionToken({ email: parsed.email });
    await setAdminSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/login]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
