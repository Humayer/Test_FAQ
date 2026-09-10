import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { parseWorkbookBuffer } from "../lib/excel/parseWorkbook";

async function buildWorkbookBuffer(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  rows.forEach((r) => sheet.addRow(r));
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe("parseWorkbookBuffer", () => {
  it("detects the header row and required columns", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Purpose", "Contact Person", "Department", "Contact Email"],
      ["Provident Fund", "Sam", "Human Resources", "sam@data-path.net"],
    ]);

    const parsed = await parseWorkbookBuffer(buffer);
    expect(parsed.headerRowNumber).toBe(1);
    expect(parsed.missingRequiredHeaders).toHaveLength(0);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].purpose).toBe("Provident Fund");
  });

  it("finds the header row even when preceded by title rows", async () => {
    const buffer = await buildWorkbookBuffer([
      ["DP HR Contact Sheet"],
      [],
      ["Purpose", "Contact Person", "Department", "Contact Email"],
      ["Income Tax", "Rahim", "Finance", "rahim@data-path.net"],
    ]);

    const parsed = await parseWorkbookBuffer(buffer);
    expect(parsed.headerRowNumber).toBe(3);
    expect(parsed.rows).toHaveLength(1);
  });

  it("preserves unrecognized columns in `extra` without breaking parsing", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Purpose", "Contact Person", "Department", "Contact Email", "Cell Phone"],
      ["Transportation", "Karim", "Admin", "karim@data-path.net", "017xxxxxxxx"],
    ]);

    const parsed = await parseWorkbookBuffer(buffer);
    expect(parsed.rows[0].extra["cell phone"]).toBe("017xxxxxxxx");
  });

  it("skips fully blank rows", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Purpose", "Contact Person", "Department", "Contact Email"],
      ["Provident Fund", "Sam", "Human Resources", "sam@data-path.net"],
      ["", "", "", ""],
      ["Income Tax", "Rahim", "Finance", "rahim@data-path.net"],
    ]);

    const parsed = await parseWorkbookBuffer(buffer);
    expect(parsed.rows).toHaveLength(2);
  });

  it("reports missing required headers when the sheet is malformed", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Topic", "Owner"],
      ["Something", "Someone"],
    ]);

    const parsed = await parseWorkbookBuffer(buffer);
    expect(parsed.headerRowNumber).toBe(-1);
    expect(parsed.missingRequiredHeaders.length).toBeGreaterThan(0);
  });
});
