import { describe, it, expect } from "vitest";
import { validateImportRow, findDuplicatePurposes } from "../lib/validation/validateImportRow";
import type { RawImportRow } from "../lib/excel/parseWorkbook";

function row(overrides: Partial<RawImportRow>): RawImportRow {
  return {
    rowNumber: 2,
    purpose: "Payroll & Gratuity",
    contactPerson: "Sam",
    department: "Human Resources",
    contactEmail: "sam@data-path.net",
    extra: {},
    ...overrides,
  };
}

describe("validateImportRow", () => {
  it("marks a clean row as valid", () => {
    const result = validateImportRow(row({}));
    expect(result.status).toBe("valid");
    expect(result.contacts[0].email).toBe("sam@data-path.net");
  });

  it("flags a malformed email domain as needing review instead of guessing", () => {
    const result = validateImportRow(row({ contactEmail: "sam@data-pathnet" }));
    expect(result.status).toBe("review");
    expect(result.contacts[0].emailIsSuspicious).toBe(true);
  });

  it("flags a near-miss domain typo as needing review", () => {
    const result = validateImportRow(row({ contactEmail: "sam@data-path.nret" }));
    expect(result.status).toBe("review");
    expect(result.contacts[0].emailReason).toMatch(/typo|does not match/i);
  });

  it("parses comma-separated contact person / email pairs", () => {
    const result = validateImportRow(
      row({ contactPerson: "Sam, Sami", contactEmail: "sam@data-path.net, sami@data-path.net" })
    );
    expect(result.status).toBe("valid");
    expect(result.contacts).toHaveLength(2);
    expect(result.contacts[1].name).toBe("Sami");
    expect(result.contacts[1].email).toBe("sami@data-path.net");
  });

  it("flags mismatched contact person / email counts for review instead of guessing pairs", () => {
    const result = validateImportRow(
      row({ contactPerson: "Sam, Sami, Rahim", contactEmail: "sam@data-path.net, sami@data-path.net" })
    );
    expect(result.status).toBe("review");
    expect(result.issues.some((i) => i.includes("does not match"))).toBe(true);
  });

  it("marks a row invalid when Purpose is missing", () => {
    const result = validateImportRow(row({ purpose: "" }));
    expect(result.status).toBe("invalid");
  });

  it("marks a row invalid when there is no contact person at all", () => {
    const result = validateImportRow(row({ contactPerson: "", contactEmail: "" }));
    expect(result.status).toBe("invalid");
  });
});

describe("findDuplicatePurposes", () => {
  it("detects duplicate purposes case-insensitively", () => {
    const rows = [
      validateImportRow(row({ rowNumber: 2, purpose: "Provident Fund" })),
      validateImportRow(row({ rowNumber: 3, purpose: "provident fund" })),
      validateImportRow(row({ rowNumber: 4, purpose: "Income Tax" })),
    ];
    const duplicates = findDuplicatePurposes(rows);
    expect(duplicates.has(2)).toBe(true);
    expect(duplicates.has(3)).toBe(true);
    expect(duplicates.has(4)).toBe(false);
  });
});
