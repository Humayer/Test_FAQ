"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ValidatedContactLite {
  name: string;
  email: string | null;
  emailIsSuspicious: boolean;
  emailReason?: string;
}

interface PreviewRow {
  rowNumber: number;
  purpose: string;
  department: string;
  contacts: ValidatedContactLite[];
  status: "valid" | "review" | "invalid";
  issues: string[];
  isDuplicate: boolean;
}

interface Preview {
  rows: PreviewRow[];
  summary: { total: number; valid: number; review: number; invalid: number };
}

interface HistoryBatch {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  reviewRows: number;
  invalidRows: number;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

const STATUS_BADGE: Record<PreviewRow["status"], string> = {
  valid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  review: "bg-amber-50 text-amber-700 border border-amber-200",
  invalid: "bg-red-50 text-red-700 border border-red-200",
};

const STATUS_LABEL: Record<PreviewRow["status"], string> = {
  valid: "✓ Valid",
  review: "⚠ Needs Review",
  invalid: "✕ Invalid",
};

export function ImportManager() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importBatchId, setImportBatchId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryBatch[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/import/history");
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.batches);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    // Initial data load on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
  }, [loadHistory]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    setPreview(null);
    setImportBatchId(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/import/preview", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to process the Excel file. Please check the required columns and file format.");
      }

      setPreview(data.preview);
      setImportBatchId(data.importBatchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process the Excel file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirm = async () => {
    if (!importBatchId) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importBatchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");

      setSuccessMessage(
        `Import approved: ${data.result.topicsCreated} topic(s) created, ${data.result.topicsUpdated} updated, ` +
          `${data.result.contactsCreated} contact(s) created, ${data.result.contactsUpdated} updated.`
      );
      setPreview(null);
      setImportBatchId(null);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Import HR contacts</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">
          Upload the HR Contact Person spreadsheet (.xlsx). Nothing is written to the database until you
          review the preview below and confirm.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="hidden"
          id="excel-upload"
        />
        <label
          htmlFor="excel-upload"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium px-4 py-2.5 cursor-pointer hover:bg-[var(--color-brand-dark)] transition-colors"
        >
          {uploading ? "Uploading…" : "Choose .xlsx file"}
        </label>
        <p className="text-xs text-[var(--color-ink-soft)] mt-2">Max 5MB. Required columns: Purpose, Contact Person, Department, Contact Email.</p>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      {successMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{successMessage}</p>
      )}

      {preview && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-[var(--color-ink)] font-medium">{preview.summary.total} rows parsed</span>
              <span className="text-emerald-700">{preview.summary.valid} valid</span>
              <span className="text-amber-700">{preview.summary.review} need review</span>
              <span className="text-red-700">{preview.summary.invalid} invalid</span>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming || preview.summary.valid + preview.summary.review === 0}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-50"
            >
              {confirming ? "Importing…" : "Confirm import"}
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs text-[var(--color-ink-soft)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-2.5 font-medium">Purpose</th>
                  <th className="px-4 py-2.5 font-medium">Contact Person</th>
                  <th className="px-4 py-2.5 font-medium">Department</th>
                  <th className="px-4 py-2.5 font-medium">Contact Email</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} title={row.issues.join(" · ") || undefined}>
                    <td className="px-4 py-2.5 text-[var(--color-ink)]">{row.purpose || "—"}</td>
                    <td className="px-4 py-2.5 text-[var(--color-ink-soft)]">
                      {row.contacts.map((c) => c.name).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-ink-soft)]">{row.department || "—"}</td>
                    <td className="px-4 py-2.5 text-[var(--color-ink-soft)]">
                      {row.contacts.map((c, i) => (
                        <span key={i} className={c.emailIsSuspicious ? "text-amber-700" : ""}>
                          {c.email || "(missing)"}
                          {i < row.contacts.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[row.status]}`}>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-xs text-[var(--color-ink-soft)] border-t border-[var(--color-border)]">
            Hover a row to see why it was flagged. Rows marked Invalid are skipped on import — fix them in
            the spreadsheet and re-upload, or add/edit them manually afterwards from the Contacts page.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Import history</h2>
        </div>
        {history.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--color-ink-soft)] text-center">No imports yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {history.map((b) => (
              <li key={b.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--color-ink)] truncate">{b.fileName}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {new Date(b.createdAt).toLocaleString()} · {b.validRows} valid · {b.reviewRows} review ·{" "}
                    {b.invalidRows} invalid
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${
                    b.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : b.status === "REJECTED"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {b.status.replace("_", " ").toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
