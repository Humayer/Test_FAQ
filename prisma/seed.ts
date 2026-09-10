import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildImportPreview } from "../lib/excel/buildPreview";
import { applyImportPreview } from "../lib/excel/applyImport";

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, "seed-data", "hr-contact-person.xlsx");

  if (!fs.existsSync(filePath)) {
    console.log(
      "No seed spreadsheet found at prisma/seed-data/hr-contact-person.xlsx — skipping initial HR data seed.\n" +
        "You can import your HR contact spreadsheet later from /admin."
    );
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const preview = await buildImportPreview(buffer);

  console.log(
    `Parsed ${preview.summary.total} rows: ${preview.summary.valid} valid, ${preview.summary.review} need review, ${preview.summary.invalid} invalid.`
  );

  await prisma.importBatch.create({
    data: {
      fileName: "hr-contact-person.xlsx (initial seed)",
      status: "APPROVED",
      totalRows: preview.summary.total,
      validRows: preview.summary.valid,
      reviewRows: preview.summary.review,
      invalidRows: preview.summary.invalid,
      previewData: JSON.parse(JSON.stringify(preview)),
      approvedAt: new Date(),
      approvedBy: "seed-script",
    },
  });

  const result = await applyImportPreview(preview);
  console.log("Seed import complete:", result);

  if (preview.summary.review > 0) {
    console.log(
      `\n⚠ ${preview.summary.review} row(s) were imported but need review (e.g. suspicious emails or mismatched counts).\n` +
        "Open /admin → Contacts to review and fix them."
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
