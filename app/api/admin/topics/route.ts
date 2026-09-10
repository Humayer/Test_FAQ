import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("q")?.trim();

    const topics = await prisma.fAQTopic.findMany({
      where: search
        ? {
            OR: [
              { purpose: { contains: search, mode: "insensitive" } },
              { department: { contains: search, mode: "insensitive" } },
              { keywords: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { sortOrder: "asc" },
      include: {
        contacts: { include: { contactPerson: true } },
      },
    });

    return NextResponse.json({ topics });
  } catch (err) {
    console.error("[GET /api/admin/topics]", err);
    return NextResponse.json(
      { error: "HR FAQ service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}

const createSchema = z.object({
  purpose: z.string().min(1).max(200),
  department: z.string().min(1).max(200),
  keywords: z.string().max(4000).optional().default(""),
  contactPersonIds: z.array(z.string()).optional().default([]),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid topic data.", details: String(e) }, { status: 400 });
  }

  try {
    const existing = await prisma.fAQTopic.findUnique({ where: { purpose: parsed.purpose } });
    if (existing) {
      return NextResponse.json({ error: "A topic with this Purpose already exists." }, { status: 409 });
    }

    const topic = await prisma.fAQTopic.create({
      data: {
        purpose: parsed.purpose,
        department: parsed.department,
        keywords: parsed.keywords,
        contacts: {
          create: parsed.contactPersonIds.map((id) => ({ contactPersonId: id })),
        },
      },
      include: { contacts: { include: { contactPerson: true } } },
    });

    return NextResponse.json({ topic }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/topics]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
