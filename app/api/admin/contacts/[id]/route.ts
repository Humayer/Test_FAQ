import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  department: z.string().max(200).nullable().optional(),
  needsReview: z.boolean().optional(),
  reviewNote: z.string().nullable().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let parsed;
  try {
    parsed = updateSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid contact data.", details: String(e) }, { status: 400 });
  }

  try {
    const contact = await prisma.contactPerson.update({ where: { id }, data: parsed });
    return NextResponse.json({ contact });
  } catch (err) {
    console.error("[PUT /api/admin/contacts/:id]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.contactPerson.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/contacts/:id]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
