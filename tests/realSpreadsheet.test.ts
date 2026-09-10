import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildImportPreview } from "../lib/excel/buildPreview";

const SEED_FILE = path.join(__dirname, "..", "prisma", "seed-data", "hr-contact-person.xlsx");

describe("buildImportPreview against the real HR Contact Person spreadsheet", () => {
  it("parses all 23 topic rows", async () => {
    const buffer = fs.readFileSync(SEED_FILE);
    const preview = await buildImportPreview(buffer);
    expect(preview.summary.total).toBe(23);
  });

  it("flags the malformed 'rehanul@data-pathnet' email for review", async () => {
    const buffer = fs.readFileSync(SEED_FILE);
    const preview = await buildImportPreview(buffer);

    const officialDocs = preview.rows.find((r) => r.purpose === "Official Documents (All Certificates)");
    expect(officialDocs).toBeDefined();
    expect(officialDocs?.status).toBe("review");

    const flagged = officialDocs?.contacts.find((c) => c.email === "rehanul@data-pathnet");
    expect(flagged?.emailIsSuspicious).toBe(true);
  });

  it("catches positionally-shifted name/email pairs via cross-row consistency, without guessing the fix", async () => {
    const buffer = fs.readFileSync(SEED_FILE);
    const preview = await buildImportPreview(buffer);

    const officialDocs = preview.rows.find((r) => r.purpose === "Official Documents (All Certificates)");
    expect(officialDocs).toBeDefined();

    // Maha's row-13 email is actually Rehanul's malformed address; Rehanul's
    // row-13 email is actually Maha's address; Rufaida's row-13 email is
    // actually Niloy's address. Each of those emails is individually
    // well-formed (except the malformed one), so only cross-row consistency
    // checking catches the other two — the importer must flag them for
    // review rather than accepting the shifted pairing at face value.
    const maha = officialDocs?.contacts.find((c) => c.name === "Maha");
    const rehanul = officialDocs?.contacts.find((c) => c.name === "Rehanul");
    const rufaida = officialDocs?.contacts.find((c) => c.name === "Rufaida");
    const shahin = officialDocs?.contacts.find((c) => c.name === "Shahin");

    expect(maha?.emailIsSuspicious).toBe(true);
    expect(rehanul?.emailIsSuspicious).toBe(true);
    expect(rufaida?.emailIsSuspicious).toBe(true);

    // Shahin's pairing (suddin@data-path.net) is consistent with the rest of
    // the sheet, so it should NOT be flagged.
    expect(shahin?.emailIsSuspicious).toBe(false);

    // The importer must never silently rewrite a value — it should only
    // flag, and the original (wrong-looking) value must still be present
    // verbatim for a human to fix.
    expect(maha?.email).toBe("rehanul@data-pathnet");
  });

  it("flags a contact name that has no clear majority email across the sheet as ambiguous ('Sam')", async () => {
    const buffer = fs.readFileSync(SEED_FILE);
    const preview = await buildImportPreview(buffer);

    // "Sam" appears in 4 rows (Payroll & Gratuity, Provident Fund, Loan,
    // Income Tax), each time paired with a *different* email, with no clear
    // majority. The importer must not silently trust any one of them.
    const rowsWithSam = preview.rows.filter((r) => r.contacts.some((c) => c.name === "Sam"));
    expect(rowsWithSam.length).toBeGreaterThanOrEqual(4);
    for (const row of rowsWithSam) {
      const sam = row.contacts.find((c) => c.name === "Sam");
      expect(sam?.emailIsSuspicious).toBe(true);
      expect(row.status).toBe("review");
    }
  });

  it("does not flag consistently-paired contacts elsewhere in the sheet", async () => {
    const buffer = fs.readFileSync(SEED_FILE);
    const preview = await buildImportPreview(buffer);

    // Employee Offboarding Process has no Sam/ambiguous contacts and no
    // format issues, so it should sail through untouched.
    const offboarding = preview.rows.find((r) => r.purpose === "Employee Offboarding Process");
    expect(offboarding?.status).toBe("valid");
    expect(offboarding?.contacts.every((c) => !c.emailIsSuspicious)).toBe(true);
  });

  it("keeps HRIS valid despite trailing blank cells in the Contact Email list", async () => {
    const buffer = fs.readFileSync(SEED_FILE);
    const preview = await buildImportPreview(buffer);

    const hris = preview.rows.find((r) => r.purpose === "HRIS");
    expect(hris).toBeDefined();
    expect(hris?.contacts).toHaveLength(3);
    expect(hris?.contacts.map((c) => c.name)).toEqual(["Sami", "Maha", "Rufaida"]);
  });

  it("has no fully invalid rows in the real sheet (every row has at least a Purpose and one contact)", async () => {
    const buffer = fs.readFileSync(SEED_FILE);
    const preview = await buildImportPreview(buffer);
    expect(preview.summary.invalid).toBe(0);
  });
});
