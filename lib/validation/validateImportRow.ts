import type { RawImportRow } from "@/lib/excel/parseWorkbook";

export type RowStatus = "valid" | "review" | "invalid";

export interface ValidatedContact {
  name: string;
  email: string | null;
  emailIsSuspicious: boolean;
  emailReason?: string;
}

export interface ValidatedImportRow {
  rowNumber: number;
  purpose: string;
  department: string;
  rawContactPerson: string;
  rawContactEmail: string;
  contacts: ValidatedContact[];
  status: RowStatus;
  issues: string[];
}

// A reasonably strict but not paranoid email pattern. We are not trying to be
// a full RFC 5322 validator — just good enough to catch obviously malformed
// company addresses like "name@data-pathnet" (missing dot) or "name@data-path.nret".
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Known-good domain for this company. Anything that looks *close* to this but
// doesn't match exactly is flagged for review rather than auto-corrected.
const EXPECTED_DOMAIN = "data-path.net";

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.replace(/\u00a0/g, " ").trim())
    .filter((v) => v.length > 0);
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function checkEmail(email: string): { suspicious: boolean; reason?: string } {
  if (!email) return { suspicious: false };

  if (!EMAIL_RE.test(email)) {
    return { suspicious: true, reason: "Does not look like a valid email address" };
  }

  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain !== EXPECTED_DOMAIN) {
    const distance = levenshtein(domain, EXPECTED_DOMAIN);
    // Close to the expected domain but not exact -> likely a typo, e.g.
    // "data-path.nret" or "data-pathnet". Never auto-correct; just flag it.
    if (distance > 0 && distance <= 3) {
      return {
        suspicious: true,
        reason: `Domain "${domain}" looks like a possible typo of "${EXPECTED_DOMAIN}"`,
      };
    }
    return {
      suspicious: true,
      reason: `Domain "${domain}" does not match the expected company domain "${EXPECTED_DOMAIN}"`,
    };
  }

  return { suspicious: false };
}

/**
 * Validates a single raw row from the workbook. Never guesses or silently
 * repairs data — it only classifies the row as valid / needs-review / invalid
 * and explains why, so a human can make the final call.
 */
export function validateImportRow(row: RawImportRow): ValidatedImportRow {
  const issues: string[] = [];

  const purpose = row.purpose.trim();
  const department = row.department.trim();

  const names = splitList(row.contactPerson);
  const emailsRaw = splitList(row.contactEmail);

  if (!purpose) issues.push("Missing Purpose");
  if (!department) issues.push("Missing Department");
  if (names.length === 0) issues.push("Missing Contact Person");
  if (emailsRaw.length === 0) issues.push("Missing Contact Email");

  let status: RowStatus = "valid";
  const contacts: ValidatedContact[] = [];

  if (names.length !== emailsRaw.length && names.length > 0 && emailsRaw.length > 0) {
    // Mismatched counts: per spec we must NOT guess which person maps to
    // which email. Flag the whole row for review and surface all raw values
    // as unpaired so an admin can fix it manually.
    issues.push(
      `Contact Person count (${names.length}) does not match Contact Email count (${emailsRaw.length})`
    );
    status = "review";

    const max = Math.max(names.length, emailsRaw.length);
    for (let i = 0; i < max; i++) {
      const name = names[i] ?? "(unmatched)";
      const email = emailsRaw[i] ?? null;
      const emailCheck = email ? checkEmail(email) : { suspicious: true, reason: "No corresponding email" };
      contacts.push({
        name,
        email,
        emailIsSuspicious: emailCheck.suspicious,
        emailReason: emailCheck.reason,
      });
    }
  } else {
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const email = emailsRaw[i] ?? null;
      const emailCheck = email ? checkEmail(email) : { suspicious: true, reason: "Missing email" };
      if (emailCheck.suspicious) {
        status = status === "invalid" ? "invalid" : "review";
        issues.push(`"${name}": ${emailCheck.reason}`);
      }
      contacts.push({
        name,
        email,
        emailIsSuspicious: emailCheck.suspicious,
        emailReason: emailCheck.reason,
      });
    }
  }

  if (!purpose || !department || contacts.length === 0) {
    status = "invalid";
  }

  return {
    rowNumber: row.rowNumber,
    purpose,
    department,
    rawContactPerson: row.contactPerson,
    rawContactEmail: row.contactEmail,
    contacts,
    status,
    issues,
  };
}

/** Detects duplicate Purpose values across the whole batch (case-insensitive). */
export function findDuplicatePurposes(rows: ValidatedImportRow[]): Set<number> {
  const seen = new Map<string, number>();
  const duplicateRowNumbers = new Set<number>();

  for (const row of rows) {
    const key = row.purpose.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) {
      duplicateRowNumbers.add(row.rowNumber);
      duplicateRowNumbers.add(seen.get(key)!);
    } else {
      seen.set(key, row.rowNumber);
    }
  }

  return duplicateRowNumbers;
}
