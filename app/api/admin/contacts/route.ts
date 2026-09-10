import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("q")?.trim();
    const reviewOnly = req.nextUrl.searchParams.get("reviewOnly") === "true";

    const contacts = await prisma.contactPerson.findMany({
      where: {
        AND: [
          reviewOnly ? { needsReview: true } : {},
          search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { department: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      orderBy: { name: "asc" },
      include: { topics: { include: { faqTopic: true } } },
    });

    return NextResponse.json({ contacts });
  } catch (err) {
    console.error("[GET /api/admin/contacts]", err);
    return NextResponse.json(
      { error: "HR FAQ service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  department: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid contact data.", details: String(e) }, { status: 400 });
  }

  try {
    const contact = await prisma.contactPerson.create({
      data: {
        name: parsed.name,
        email: parsed.email ?? null,
        department: parsed.department,
        needsReview: false,
      },
    });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/contacts]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
