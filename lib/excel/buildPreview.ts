import { parseWorkbookBuffer } from "./parseWorkbook";
import { validateImportRow, findDuplicatePurposes, type ValidatedImportRow } from "@/lib/validation/validateImportRow";

export interface ImportPreview {
  headerRowNumber: number;
  missingRequiredHeaders: string[];
  rows: (ValidatedImportRow & { isDuplicate: boolean })[];
  summary: {
    total: number;
    valid: number;
    review: number;
    invalid: number;
  };
}

const MIN_OCCURRENCES_FOR_CANONICAL = 2;

interface CanonicalResult {
  email: string;
  count: number;
  /** True when this name has no single clearly-dominant email (a tie for the
   * top spot, or too few confirmations) — every occurrence of this name
   * should be flagged for review rather than trusting a coin-flip "winner". */
  ambiguous: boolean;
}

/**
 * Builds a "canonical" email per contact name by looking at every
 * *individually well-formed, non-suspicious* pairing across the whole
 * workbook.
 *
 * This exists because a row can have a plausible-looking Contact Person /
 * Contact Email pairing where each email is individually valid, but the
 * values have been positionally shifted in the spreadsheet (e.g. "Maha"
 * paired with what is actually "Rehanul"'s email elsewhere in the sheet).
 * Per-row format/count checks alone cannot catch that — only comparing
 * against how that same name is paired elsewhere in the file can.
 *
 * Two outcomes per name:
 *  - A clear majority email (strictly more occurrences than the runner-up,
 *    with at least MIN_OCCURRENCES_FOR_CANONICAL confirmations) becomes that
 *    name's canonical email; any row pairing that name with something else
 *    gets flagged as a likely misalignment.
 *  - No clear majority (a tie, or too few confirmed occurrences to be sure)
 *    means we genuinely cannot tell which email is correct — every
 *    occurrence of that name is flagged as ambiguous instead of guessing.
 */
function buildCanonicalEmailMap(rows: ValidatedImportRow[]): Map<string, CanonicalResult> {
  const tally = new Map<string, Map<string, number>>();

  for (const row of rows) {
    for (const contact of row.contacts) {
      if (contact.emailIsSuspicious || !contact.email || !contact.name) continue;
      const nameKey = contact.name.trim().toLowerCase();
      const emailCounts = tally.get(nameKey) ?? new Map<string, number>();
      emailCounts.set(contact.email, (emailCounts.get(contact.email) ?? 0) + 1);
      tally.set(nameKey, emailCounts);
    }
  }

  const canonical = new Map<string, CanonicalResult>();
  for (const [nameKey, emailCounts] of tally) {
    const sorted = [...emailCounts.entries()].sort((a, b) => b[1] - a[1]);
    const [topEmail, topCount] = sorted[0];
    const secondCount = sorted[1]?.[1] ?? 0;

    if (emailCounts.size === 1) {
      // Only ever seen paired with one email — nothing to disambiguate.
      if (topCount >= MIN_OCCURRENCES_FOR_CANONICAL) {
        canonical.set(nameKey, { email: topEmail, count: topCount, ambiguous: false });
      }
      continue;
    }

    const hasClearMajority = topCount > secondCount && topCount >= MIN_OCCURRENCES_FOR_CANONICAL;
    canonical.set(nameKey, { email: topEmail, count: topCount, ambiguous: !hasClearMajority });
  }
  return canonical;
}

/**
 * Flags any contact whose email contradicts the canonical email established
 * for that name elsewhere in the sheet, or — when that name has no clear
 * canonical email at all (a tie between multiple different emails) — flags
 * every occurrence of that name so an admin resolves the ambiguity. Never
 * rewrites a value — only adds a review flag and an explanatory issue.
 */
function flagCrossRowMismatches(
  rows: ValidatedImportRow[],
  canonical: Map<string, CanonicalResult>
): ValidatedImportRow[] {
  return rows.map((row) => {
    let rowStatus = row.status;
    const issues = [...row.issues];

    const contacts = row.contacts.map((contact) => {
      if (contact.emailIsSuspicious || !contact.email || !contact.name) return contact;

      const nameKey = contact.name.trim().toLowerCase();
      const known = canonical.get(nameKey);
      if (!known) return contact;

      if (known.ambiguous) {
        rowStatus = rowStatus === "invalid" ? "invalid" : "review";
        issues.push(
          `"${contact.name}" is paired with different email addresses in different rows of this sheet ` +
            `(no single email is clearly correct) — please confirm which one is right`
        );
        return {
          ...contact,
          emailIsSuspicious: true,
          emailReason: `"${contact.name}" is paired with inconsistent emails across the sheet — needs manual confirmation`,
        };
      }

      if (known.email !== contact.email) {
        rowStatus = rowStatus === "invalid" ? "invalid" : "review";
        issues.push(
          `"${contact.name}": email "${contact.email}" differs from the email normally used for ` +
            `"${contact.name}" elsewhere in this sheet ("${known.email}") — the Purpose/Contact Person/` +
            `Contact Email columns may be misaligned for this row`
        );
        return {
          ...contact,
          emailIsSuspicious: true,
          emailReason: `Differs from "${contact.name}"'s email elsewhere in the sheet ("${known.email}")`,
        };
      }
      return contact;
    });

    return { ...row, contacts, status: rowStatus, issues };
  });
}

export async function buildImportPreview(buffer: Buffer): Promise<ImportPreview> {
  const parsed = await parseWorkbookBuffer(buffer);
  const initialRows = parsed.rows.map(validateImportRow);

  // Cross-row consistency pass — catches shifted/misaligned pairings that
  // look individually valid but contradict how the same person is paired
  // with an email everywhere else in the file.
  const canonical = buildCanonicalEmailMap(initialRows);
  const validatedRows = flagCrossRowMismatches(initialRows, canonical);

  const duplicateRowNumbers = findDuplicatePurposes(validatedRows);

  const rows = validatedRows.map((row) => {
    const isDuplicate = duplicateRowNumbers.has(row.rowNumber);
    return {
      ...row,
      status: isDuplicate && row.status === "valid" ? ("review" as const) : row.status,
      issues: isDuplicate ? [...row.issues, "Duplicate Purpose within this file"] : row.issues,
      isDuplicate,
    };
  });

  const summary = rows.reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.status] += 1;
      return acc;
    },
    { total: 0, valid: 0, review: 0, invalid: 0 }
  );

  return {
    headerRowNumber: parsed.headerRowNumber,
    missingRequiredHeaders: parsed.missingRequiredHeaders,
    rows,
    summary,
  };
}
