import ExcelJS from "exceljs";

/**
 * Raw row extracted from the workbook, before validation.
 * Extra/unrecognized columns are preserved in `extra` so the importer never
 * silently drops data, but they are not used for FAQ routing.
 */
export interface RawImportRow {
  rowNumber: number;
  purpose: string;
  contactPerson: string;
  department: string;
  contactEmail: string;
  extra: Record<string, string>;
}

const REQUIRED_HEADERS = ["purpose", "contact person", "department", "contact email"];

// Columns the spec explicitly calls out as "ignore" — kept only in `extra`.
const IGNORED_HEADER_HINTS = ["cell phone", "person", "number of work"];

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in (value as Record<string, unknown>)) {
    // Rich text cells from ExcelJS
    return String((value as { text: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && "result" in (value as Record<string, unknown>)) {
    // Formula cells
    return String((value as { result: unknown }).result ?? "").trim();
  }
  return String(value)
    .replace(/\u00a0/g, " ") // non-breaking space -> normal space
    .trim();
}

export interface ParsedWorkbook {
  headerRowNumber: number;
  headers: string[];
  rows: RawImportRow[];
  missingRequiredHeaders: string[];
}

/**
 * Reads an .xlsx workbook buffer, auto-detects the header row (scanning the
 * first 10 rows for one that contains all required column names), and
 * extracts each data row. Unknown columns are preserved but ignored for
 * routing purposes, per spec section 8.
 */
export async function parseWorkbookBuffer(buffer: Buffer): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { headerRowNumber: -1, headers: [], rows: [], missingRequiredHeaders: REQUIRED_HEADERS };
  }

  let headerRowNumber = -1;
  let headerMap: Record<string, number> = {};

  const maxScanRow = Math.min(10, worksheet.rowCount);
  for (let r = 1; r <= maxScanRow; r++) {
    const row = worksheet.getRow(r);
    const candidateMap: Record<string, number> = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = normalizeHeader(cellToString(cell.value));
      if (header) candidateMap[header] = colNumber;
    });
    const matches = REQUIRED_HEADERS.filter((h) => h in candidateMap);
    if (matches.length >= 3) {
      headerRowNumber = r;
      headerMap = candidateMap;
      break;
    }
  }

  if (headerRowNumber === -1) {
    return { headerRowNumber: -1, headers: [], rows: [], missingRequiredHeaders: REQUIRED_HEADERS };
  }

  const missingRequiredHeaders = REQUIRED_HEADERS.filter((h) => !(h in headerMap));
  const headers = Object.keys(headerMap);

  const knownCols = new Set([
    headerMap["purpose"],
    headerMap["contact person"],
    headerMap["department"],
    headerMap["contact email"],
  ]);

  const rows: RawImportRow[] = [];

  for (let r = headerRowNumber + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    if (row.cellCount === 0) continue;

    const get = (headerName: string) => {
      const col = headerMap[headerName];
      if (!col) return "";
      return cellToString(row.getCell(col).value);
    };

    const purpose = get("purpose");
    const contactPerson = get("contact person");
    const department = get("department");
    const contactEmail = get("contact email");

    // Skip fully blank rows.
    if (!purpose && !contactPerson && !department && !contactEmail) continue;

    const extra: Record<string, string> = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (knownCols.has(colNumber)) return;
      const headerEntry = Object.entries(headerMap).find(([, c]) => c === colNumber);
      const headerName = headerEntry?.[0] ?? `column_${colNumber}`;
      const isIgnoredHint = IGNORED_HEADER_HINTS.some((hint) => headerName.includes(hint));
      extra[headerName] = cellToString(cell.value);
      void isIgnoredHint; // kept for readability / future filtering rules
    });

    rows.push({
      rowNumber: r,
      purpose,
      contactPerson,
      department,
      contactEmail,
      extra,
    });
  }

  return { headerRowNumber, headers, rows, missingRequiredHeaders };
}
