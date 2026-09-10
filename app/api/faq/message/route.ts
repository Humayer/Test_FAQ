import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleIncomingMessage } from "@/lib/faq/conversationService";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

const bodySchema = z.object({
  sessionId: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`msg:${getClientKey(req)}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds ?? 30) } }
    );
  }

  let parsed;
  try {
    const json = await req.json();
    parsed = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await handleIncomingMessage(parsed.sessionId, parsed.message.trim());
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/faq/message]", err);
    return NextResponse.json(
      { error: "HR FAQ service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
