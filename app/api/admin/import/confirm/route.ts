import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { applyImportPreview } from "@/lib/excel/applyImport";
import { getAdminSession } from "@/lib/auth/adminAuth";
import type { ImportPreview } from "@/lib/excel/buildPreview";

const bodySchema = z.object({ importBatchId: z.string().min(1) });

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const batch = await prisma.importBatch.findUnique({ where: { id: parsed.importBatchId } });
    if (!batch) {
      return NextResponse.json({ error: "Import batch not found." }, { status: 404 });
    }
    if (batch.status === "APPROVED") {
      return NextResponse.json({ error: "This import has already been approved." }, { status: 409 });
    }

    const preview = batch.previewData as unknown as ImportPreview;
    const result = await applyImportPreview(preview);

    const session = await getAdminSession();

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: session?.email ?? "admin",
      },
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[/api/admin/import/confirm]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
