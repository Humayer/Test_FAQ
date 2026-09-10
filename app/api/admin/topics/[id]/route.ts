import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const updateSchema = z.object({
  purpose: z.string().min(1).max(200).optional(),
  department: z.string().min(1).max(200).optional(),
  keywords: z.string().max(4000).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  contactPersonIds: z.array(z.string()).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let parsed;
  try {
    parsed = updateSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid topic data.", details: String(e) }, { status: 400 });
  }

  try {
    const { contactPersonIds, ...rest } = parsed;

    const topic = await prisma.fAQTopic.update({
      where: { id },
      data: {
        ...rest,
        ...(contactPersonIds
          ? {
              contacts: {
                deleteMany: {},
                create: contactPersonIds.map((cid) => ({ contactPersonId: cid })),
              },
            }
          : {}),
      },
      include: { contacts: { include: { contactPerson: true } } },
    });

    return NextResponse.json({ topic });
  } catch (err) {
    console.error("[PUT /api/admin/topics/:id]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.fAQTopic.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/topics/:id]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
