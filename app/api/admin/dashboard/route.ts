import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const [totalTopics, totalContacts, validEmails, needsReview, recentImports] = await Promise.all([
      prisma.fAQTopic.count(),
      prisma.contactPerson.count(),
      prisma.contactPerson.count({ where: { needsReview: false, email: { not: null } } }),
      prisma.contactPerson.count({ where: { needsReview: true } }),
      prisma.importBatch.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          fileName: true,
          status: true,
          totalRows: true,
          validRows: true,
          reviewRows: true,
          invalidRows: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalTopics,
      totalContacts,
      validEmails,
      needsReview,
      recentImports,
    });
  } catch (err) {
    console.error("[/api/admin/dashboard]", err);
    return NextResponse.json(
      { error: "HR FAQ service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
