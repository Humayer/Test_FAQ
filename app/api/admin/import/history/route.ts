import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const batches = await prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        status: true,
        totalRows: true,
        validRows: true,
        reviewRows: true,
        invalidRows: true,
        createdAt: true,
        approvedAt: true,
        approvedBy: true,
      },
    });
    return NextResponse.json({ batches });
  } catch (err) {
    console.error("[/api/admin/import/history]", err);
    return NextResponse.json(
      { error: "HR FAQ service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
