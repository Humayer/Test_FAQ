import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth/adminAuth";

export async function POST() {
  await clearAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
