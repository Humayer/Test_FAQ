import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const topics = await prisma.fAQTopic.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, purpose: true },
    });
    return NextResponse.json({ topics });
  } catch (err) {
    console.error("[/api/faq/topics]", err);
    return NextResponse.json(
      { error: "HR FAQ service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
