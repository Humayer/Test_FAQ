import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildImportPreview } from "@/lib/excel/buildPreview";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".xlsx"];
const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream", // some browsers/OSes send this for .xlsx
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasAllowedExtension) {
      return NextResponse.json(
        { error: "Unable to process the Excel file. Please check the required columns and file format." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File is too large. Maximum size is 5MB." }, { status: 400 });
    }

    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      // Not fatal on its own (browsers are inconsistent about MIME types for
      // .xlsx), but combined with a wrong extension this would already have
      // been rejected above.
      console.warn(`[import/preview] Unexpected MIME type: ${file.type}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await buildImportPreview(buffer);

    if (preview.headerRowNumber === -1 || preview.missingRequiredHeaders.length > 0) {
      return NextResponse.json(
        {
          error: "Unable to process the Excel file. Please check the required columns and file format.",
          missingRequiredHeaders: preview.missingRequiredHeaders,
        },
        { status: 422 }
      );
    }

    const batch = await prisma.importBatch.create({
      data: {
        fileName: file.name,
        status: "PENDING_REVIEW",
        totalRows: preview.summary.total,
        validRows: preview.summary.valid,
        reviewRows: preview.summary.review,
        invalidRows: preview.summary.invalid,
        previewData: JSON.parse(JSON.stringify(preview)),
      },
    });

    return NextResponse.json({ importBatchId: batch.id, preview });
  } catch (err) {
    console.error("[/api/admin/import/preview]", err);
    return NextResponse.json(
      { error: "Unable to process the Excel file. Please check the required columns and file format." },
      { status: 500 }
    );
  }
}
